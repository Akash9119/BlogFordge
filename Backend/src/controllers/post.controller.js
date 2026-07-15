const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { parsePagination, buildMeta, parseSort } = require('../utils/pagination');
const { isStaff } = require('../middleware/auth');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const Comment = require('../models/Comment');

const AUTHOR_FIELDS = 'name avatar role';
const LIST_PROJECTION = '-content'; // full content only on the detail endpoint

function canManage(user, post) {
  return isStaff(user) || post.author._id.equals(user._id);
}

/**
 * GET /posts — public sees published only; authors additionally see their own
 * drafts/archived; editors and admins see everything.
 * Query: page, limit, sort, status, category, tag, author (id|me), q
 */
async function listPosts(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const user = req.user;

  const filter = {};

  // --- status visibility ---
  const requestedStatus = Post.STATUSES.includes(req.query.status) ? req.query.status : null;
  if (!user) {
    filter.status = 'published';
  } else if (isStaff(user)) {
    if (requestedStatus) filter.status = requestedStatus;
  } else if (requestedStatus && requestedStatus !== 'published') {
    filter.status = requestedStatus;
    filter.author = user._id; // authors may only browse their own non-published posts
  } else if (requestedStatus === 'published') {
    filter.status = 'published';
  } else {
    filter.$or = [{ status: 'published' }, { author: user._id }];
  }

  // --- author filter ---
  if (req.query.author === 'me' && user) {
    filter.author = user._id;
  } else if (req.query.author && mongoose.isValidObjectId(req.query.author)) {
    filter.author = req.query.author;
  }

  // --- taxonomy filters (by slug) ---
  if (req.query.category) {
    const category = await Category.findOne({ slug: req.query.category });
    if (!category) return ok(res, { data: [], meta: buildMeta({ page, limit, total: 0 }) });
    filter.categories = category._id;
  }
  if (req.query.tag) {
    const tag = await Tag.findOne({ slug: req.query.tag });
    if (!tag) return ok(res, { data: [], meta: buildMeta({ page, limit, total: 0 }) });
    filter.tags = tag._id;
  }

  // --- text search ---
  let sort = parseSort(req.query.sort, ['createdAt', 'publishedAt', 'title', 'viewCount'], '-publishedAt -createdAt');
  let projection = LIST_PROJECTION;
  if (req.query.q) {
    filter.$text = { $search: String(req.query.q) };
    projection = { content: 0, score: { $meta: 'textScore' } };
    sort = { score: { $meta: 'textScore' } };
  }

  const [posts, total] = await Promise.all([
    Post.find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', AUTHOR_FIELDS)
      .populate('categories', 'name slug')
      .populate('tags', 'name slug'),
    Post.countDocuments(filter),
  ]);

  return ok(res, { data: posts, meta: buildMeta({ page, limit, total }) });
}

/** GET /posts/:idOrSlug — drafts/archived visible only to the owner or staff. */
async function getPost(req, res) {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

  const post = await Post.findOne(query)
    .populate('author', AUTHOR_FIELDS)
    .populate('categories', 'name slug')
    .populate('tags', 'name slug');
  if (!post) throw new ApiError(404, 'Post not found');

  if (post.status !== 'published' && (!req.user || !canManage(req.user, post))) {
    throw new ApiError(404, 'Post not found'); // don't leak existence of drafts
  }
  return ok(res, { data: post });
}

async function validateTaxonomies(body) {
  if (body.categories?.length) {
    const count = await Category.countDocuments({ _id: { $in: body.categories } });
    if (count !== new Set(body.categories.map(String)).size) {
      throw new ApiError(422, 'One or more categories do not exist');
    }
  }
  if (body.tags?.length) {
    const count = await Tag.countDocuments({ _id: { $in: body.tags } });
    if (count !== new Set(body.tags.map(String)).size) {
      throw new ApiError(422, 'One or more tags do not exist');
    }
  }
}

/** POST /posts — any authenticated writer; always starts as a draft. */
async function createPost(req, res) {
  await validateTaxonomies(req.body);
  const { title, content, excerpt, coverImage, categories, tags, seo } = req.body;
  const post = await Post.create({
    title,
    content,
    excerpt,
    coverImage,
    categories,
    tags,
    seo,
    author: req.user._id,
    status: 'draft',
  });
  return created(res, { message: 'Draft created', data: post });
}

/** PATCH /posts/:id — owner or staff. */
async function updatePost(req, res) {
  const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!canManage(req.user, post)) throw new ApiError(403, 'You can only edit your own posts');

  await validateTaxonomies(req.body);
  const allowed = ['title', 'content', 'excerpt', 'coverImage', 'categories', 'tags', 'seo'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) post[field] = req.body[field];
  }
  await post.save();
  return ok(res, { message: 'Post updated', data: post });
}

/** DELETE /posts/:id — authors may delete their own drafts; staff anything. */
async function deletePost(req, res) {
  const post = await Post.findById(req.params.id).populate('author', AUTHOR_FIELDS);
  if (!post) throw new ApiError(404, 'Post not found');

  const ownsDraft = post.author._id.equals(req.user._id) && post.status === 'draft';
  if (!isStaff(req.user) && !ownsDraft) {
    throw new ApiError(403, 'Authors can only delete their own drafts');
  }
  await Promise.all([post.deleteOne(), Comment.deleteMany({ post: post._id })]);
  return ok(res, { message: 'Post deleted' });
}

/** PATCH /posts/:id/publish — editor/admin (enforced in routes). */
async function publishPost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (post.status === 'published') throw new ApiError(400, 'Post is already published');

  post.status = 'published';
  post.publishedAt = post.publishedAt || new Date();
  await post.save();
  return ok(res, { message: 'Post published', data: post });
}

/** PATCH /posts/:id/archive — editor/admin (enforced in routes). */
async function archivePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (post.status === 'archived') throw new ApiError(400, 'Post is already archived');

  post.status = 'archived';
  await post.save();
  return ok(res, { message: 'Post archived', data: post });
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, publishPost, archivePost };

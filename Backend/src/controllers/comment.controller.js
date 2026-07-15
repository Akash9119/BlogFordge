const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { isStaff } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

/**
 * GET /posts/:postId/comments — public sees approved only; staff may filter
 * any status with ?status=. Returned flat with `parent` refs; clients nest.
 */
async function listComments(req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, 'Post not found');

  const filter = { post: post._id };
  if (isStaff(req.user) && Comment.STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  } else if (!isStaff(req.user)) {
    filter.status = 'approved';
  }

  const [comments, total] = await Promise.all([
    Comment.find(filter).sort('createdAt').skip(skip).limit(limit).populate('author', 'name avatar'),
    Comment.countDocuments(filter),
  ]);
  return ok(res, { data: comments, meta: buildMeta({ page, limit, total }) });
}

/** POST /posts/:postId/comments — authenticated; staff comments auto-approve. */
async function createComment(req, res) {
  const post = await Post.findById(req.params.postId);
  if (!post || post.status !== 'published') {
    throw new ApiError(404, 'Post not found or not open for comments');
  }

  if (req.body.parent) {
    const parent = await Comment.findById(req.body.parent);
    if (!parent || !parent.post.equals(post._id)) {
      throw new ApiError(422, 'Parent comment does not belong to this post');
    }
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    parent: req.body.parent || null,
    content: req.body.content,
    status: isStaff(req.user) ? 'approved' : 'pending',
  });
  await comment.populate('author', 'name avatar');
  return created(res, {
    message: comment.status === 'approved' ? 'Comment posted' : 'Comment submitted for moderation',
    data: comment,
  });
}

/** PATCH /comments/:id/moderate — editor/admin (enforced in routes). */
async function moderateComment(req, res) {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  comment.status = req.body.status;
  await comment.save();
  return ok(res, { message: `Comment ${comment.status}`, data: comment });
}

/** DELETE /comments/:id — own comment or staff. Replies are detached, not deleted. */
async function deleteComment(req, res) {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (!isStaff(req.user) && !comment.author.equals(req.user._id)) {
    throw new ApiError(403, 'You can only delete your own comments');
  }
  await Promise.all([
    comment.deleteOne(),
    Comment.updateMany({ parent: comment._id }, { parent: null }),
  ]);
  return ok(res, { message: 'Comment deleted' });
}

module.exports = { listComments, createComment, moderateComment, deleteComment };

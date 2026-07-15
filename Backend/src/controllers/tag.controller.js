const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { parsePagination, buildMeta } = require('../utils/pagination');
const Tag = require('../models/Tag');
const Post = require('../models/Post');

async function listTags(req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100 });
  const [tags, total] = await Promise.all([
    Tag.find().sort('name').skip(skip).limit(limit),
    Tag.countDocuments(),
  ]);
  return ok(res, { data: tags, meta: buildMeta({ page, limit, total }) });
}

async function createTag(req, res) {
  const tag = await Tag.create({ name: req.body.name });
  return created(res, { message: 'Tag created', data: tag });
}

async function updateTag(req, res) {
  const tag = await Tag.findById(req.params.id);
  if (!tag) throw new ApiError(404, 'Tag not found');
  tag.name = req.body.name;
  await tag.save();
  return ok(res, { message: 'Tag updated', data: tag });
}

async function deleteTag(req, res) {
  const tag = await Tag.findById(req.params.id);
  if (!tag) throw new ApiError(404, 'Tag not found');
  await Promise.all([
    tag.deleteOne(),
    Post.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } }),
  ]);
  return ok(res, { message: 'Tag deleted' });
}

module.exports = { listTags, createTag, updateTag, deleteTag };

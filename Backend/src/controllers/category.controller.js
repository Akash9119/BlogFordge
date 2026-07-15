const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { parsePagination, buildMeta } = require('../utils/pagination');
const Category = require('../models/Category');
const Post = require('../models/Post');

async function listCategories(req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [categories, total] = await Promise.all([
    Category.find().sort('name').skip(skip).limit(limit),
    Category.countDocuments(),
  ]);
  return ok(res, { data: categories, meta: buildMeta({ page, limit, total }) });
}

async function getCategory(req, res) {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) throw new ApiError(404, 'Category not found');
  return ok(res, { data: category });
}

async function createCategory(req, res) {
  const category = await Category.create({ name: req.body.name, description: req.body.description });
  return created(res, { message: 'Category created', data: category });
}

async function updateCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  if (req.body.name !== undefined) category.name = req.body.name;
  if (req.body.description !== undefined) category.description = req.body.description;
  await category.save();
  return ok(res, { message: 'Category updated', data: category });
}

async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  await Promise.all([
    category.deleteOne(),
    Post.updateMany({ categories: category._id }, { $pull: { categories: category._id } }),
  ]);
  return ok(res, { message: 'Category deleted' });
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };

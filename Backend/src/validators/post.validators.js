const { body } = require('express-validator');

const objectIdArray = (field, label) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${label} must be an array`)
    .custom((arr) => arr.every((id) => /^[a-f\d]{24}$/i.test(String(id))))
    .withMessage(`${label} must contain valid ids`);

const shared = [
  body('excerpt').optional().isString().trim().isLength({ max: 300 }).withMessage('Excerpt max 300 characters'),
  body('coverImage').optional().isString().trim().isLength({ max: 2048 }),
  objectIdArray('categories', 'categories'),
  objectIdArray('tags', 'tags'),
  body('seo.metaTitle').optional().isString().trim().isLength({ max: 70 }),
  body('seo.metaDescription').optional().isString().trim().isLength({ max: 160 }),
];

const create = [
  body('title').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('content').isString().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  ...shared,
];

const update = [
  body('title').optional().isString().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('content').optional().isString().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  ...shared,
];

module.exports = { create, update };

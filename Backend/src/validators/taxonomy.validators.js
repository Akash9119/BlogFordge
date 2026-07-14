const { body } = require('express-validator');

const category = [
  body('name').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('description').optional().isString().trim().isLength({ max: 300 }).withMessage('Description max 300 characters'),
];

const categoryUpdate = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('description').optional().isString().trim().isLength({ max: 300 }).withMessage('Description max 300 characters'),
];

const tag = [body('name').isString().trim().isLength({ min: 2, max: 40 }).withMessage('Name must be 2-40 characters')];

module.exports = { category, categoryUpdate, tag };

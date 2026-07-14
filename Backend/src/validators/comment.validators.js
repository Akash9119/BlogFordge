const { body } = require('express-validator');
const Comment = require('../models/Comment');

const create = [
  body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
  body('parent').optional({ values: 'null' }).isMongoId().withMessage('parent must be a valid comment id'),
];

const moderate = [
  body('status').isIn(Comment.STATUSES).withMessage(`status must be one of: ${Comment.STATUSES.join(', ')}`),
];

module.exports = { create, moderate };

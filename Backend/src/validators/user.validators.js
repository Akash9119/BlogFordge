const { body } = require('express-validator');
const User = require('../models/User');

const updateMe = [
  body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('bio').optional().isString().trim().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  body('avatar').optional().isString().trim().isLength({ max: 2048 }),
];

const setRole = [body('role').isIn(User.ROLES).withMessage(`role must be one of: ${User.ROLES.join(', ')}`)];

const setStatus = [body('isActive').isBoolean().withMessage('isActive must be a boolean')];

module.exports = { updateMe, setRole, setStatus };

const { body } = require('express-validator');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters')
  .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one letter and one number');

const register = [
  body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  passwordRule,
];

const login = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password required'),
];

const refresh = [body('refreshToken').isString().notEmpty().withMessage('refreshToken required')];

const changePassword = [
  body('currentPassword').isString().notEmpty().withMessage('currentPassword required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
];

module.exports = { register, login, refresh, changePassword };

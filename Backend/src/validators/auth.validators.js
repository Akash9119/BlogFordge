const { body } = require('express-validator');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters')
  .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one letter and one number');

// Case-fold only. normalizeEmail() must NOT be used here: it strips dots from
// gmail addresses, so a seeded admin (stored verbatim) could never log in.
const emailRule = body('email').isEmail().withMessage('Valid email required').trim().toLowerCase();

const register = [
  body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  emailRule,
  passwordRule,
];

const login = [emailRule, body('password').isString().notEmpty().withMessage('Password required')];

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

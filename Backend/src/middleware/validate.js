const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Wrap express-validator rules so failures surface through the global
 * error handler in the standard envelope.
 */
function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) return next();
      const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
      return next(new ApiError(422, 'Validation failed', details));
    },
  ];
}

module.exports = validate;

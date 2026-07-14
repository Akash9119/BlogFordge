const { rateLimit } = require('express-rate-limit');

const standardOptions = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
};

/** Global API budget per IP. */
const apiLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

/** Stricter budget for credential endpoints (login/register/refresh). */
const authLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
});

/** View-tracking endpoint — cheap but public. */
const viewLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 1000,
  limit: 60,
});

module.exports = { apiLimiter, authLimiter, viewLimiter };

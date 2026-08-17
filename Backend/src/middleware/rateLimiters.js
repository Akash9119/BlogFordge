const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

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

/**
 * AI generation — the only endpoints that cost real money per request, and the
 * slowest by an order of magnitude. Keyed per user rather than per IP so one
 * office behind one NAT doesn't share a single budget.
 */
const aiLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req.user ? String(req.user._id) : ipKeyGenerator(req)),
  message: { success: false, message: 'You have used this hour’s AI budget. Try again shortly.' },
});

module.exports = { apiLimiter, authLimiter, viewLimiter, aiLimiter };

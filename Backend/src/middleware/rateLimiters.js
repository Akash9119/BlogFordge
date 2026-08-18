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

/**
 * Stricter budget for credential endpoints (login/refresh).
 *
 * Successful requests are not counted, so a legitimate user working normally is
 * never locked out — the limit exists to slow down guessing, and a correct
 * password is not a guess.
 */
const authLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
});

/**
 * Sign-up gets its own limiter, and this one counts successes.
 *
 * `skipSuccessfulRequests` is right for login and wrong here: a *successful*
 * registration is exactly what an abuser wants to repeat. Every new account is
 * an author with its own AI budget, so uncounted sign-ups turn the hourly AI
 * limit into no limit at all — one IP just mints more accounts.
 */
const registerLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { success: false, message: 'Too many accounts created from here. Try again later.' },
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
  limit: Number.parseInt(process.env.AI_RATE_LIMIT_HOURLY, 10) || 30,
  keyGenerator: (req) => (req.user ? String(req.user._id) : ipKeyGenerator(req)),
  message: { success: false, message: 'You have used this hour’s AI budget. Try again shortly.' },
});

/**
 * The daily ceiling behind the hourly one.
 *
 * An hourly limit caps a burst but not a day: 30/hour is 720/day if someone is
 * patient, which is a real bill. This is the number that actually bounds spend
 * per account, so it is the one to set from what an invoice can absorb.
 */
const aiDailyLimiter = rateLimit({
  ...standardOptions,
  windowMs: 24 * 60 * 60 * 1000,
  limit: Number.parseInt(process.env.AI_RATE_LIMIT_DAILY, 10) || 100,
  keyGenerator: (req) => (req.user ? String(req.user._id) : ipKeyGenerator(req)),
  message: { success: false, message: 'You have used today’s AI budget. It resets in 24 hours.' },
});

module.exports = { apiLimiter, authLimiter, registerLimiter, viewLimiter, aiLimiter, aiDailyLimiter };

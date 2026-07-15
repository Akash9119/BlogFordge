const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { sha256, issueTokenPair, revokeAllUserTokens } = require('../utils/tokens');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

/** POST /auth/register — public sign-up always gets the least-privileged role. */
async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, role: 'author' });
  const tokens = await issueTokenPair(user, req);
  return created(res, { message: 'Account created', data: { user, ...tokens } });
}

/** POST /auth/login */
async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  const tokens = await issueTokenPair(user, req);
  return ok(res, { message: 'Logged in', data: { user, ...tokens } });
}

/**
 * POST /auth/refresh — rotate the refresh token.
 * A valid-signature token that is unknown or already revoked signals theft/reuse:
 * every active session for that user is revoked.
 */
async function refresh(req, res) {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenHash: sha256(refreshToken) });
  if (!stored || stored.revokedAt) {
    await revokeAllUserTokens(payload.sub);
    throw new ApiError(401, 'Refresh token reuse detected — all sessions revoked, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated');

  const tokens = await issueTokenPair(user, req);
  stored.revokedAt = new Date();
  stored.replacedByTokenHash = sha256(tokens.refreshToken);
  await stored.save();

  return ok(res, { message: 'Token refreshed', data: tokens });
}

/** POST /auth/logout — revoke the presented refresh token. */
async function logout(req, res) {
  const { refreshToken } = req.body;
  await RefreshToken.updateOne(
    { tokenHash: sha256(refreshToken), revokedAt: null },
    { revokedAt: new Date() }
  );
  return ok(res, { message: 'Logged out' });
}

/** GET /auth/me */
async function me(req, res) {
  return ok(res, { data: { user: req.user } });
}

module.exports = { register, login, refresh, logout, me };

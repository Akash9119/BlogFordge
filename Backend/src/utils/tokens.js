const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.jwt.accessSecret, {
    subject: user._id.toString(),
    expiresIn: env.jwt.accessExpires,
  });
}

/**
 * Sign a refresh token and persist its hash so it can be rotated and revoked.
 */
async function issueRefreshToken(user, req) {
  const token = jwt.sign({}, env.jwt.refreshSecret, {
    subject: user._id.toString(),
    jwtid: crypto.randomUUID(),
    expiresIn: env.jwt.refreshExpires,
  });
  const { exp } = jwt.decode(token);
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(token),
    expiresAt: new Date(exp * 1000),
    createdByIp: req.ip,
    userAgent: req.get('user-agent'),
  });
  return token;
}

async function issueTokenPair(user, req) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user, req),
  };
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

module.exports = { sha256, signAccessToken, issueRefreshToken, issueTokenPair, revokeAllUserTokens };

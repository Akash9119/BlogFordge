const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

function extractBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function resolveUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new ApiError(401, 'Access token expired');
    throw new ApiError(401, 'Invalid access token');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated');
  return user;
}

/** Rejects the request unless a valid access token is presented. */
async function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) throw new ApiError(401, 'Authentication required');
  req.user = await resolveUser(token);
  next();
}

/** Attaches req.user when a token is presented; anonymous requests pass through. */
async function optionalAuth(req, res, next) {
  const token = extractBearer(req);
  if (token) req.user = await resolveUser(token);
  next();
}

/** RBAC guard — must run after requireAuth. */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
}

const isStaff = (user) => Boolean(user) && ['admin', 'editor'].includes(user.role);

module.exports = { requireAuth, optionalAuth, requireRoles, isStaff };

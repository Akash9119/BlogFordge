const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const { parsePagination, buildMeta, parseSort } = require('../utils/pagination');
const { revokeAllUserTokens } = require('../utils/tokens');
const User = require('../models/User');

/** GET /users — admin only. Supports ?role=&q=&page=&limit=&sort= */
async function listUsers(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort, ['createdAt', 'name', 'email', 'role'], '-createdAt');

  const filter = {};
  if (req.query.role && User.ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.isActive === 'true' || req.query.isActive === 'false') {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return ok(res, { data: users, meta: buildMeta({ page, limit, total }) });
}

/** GET /users/:id — admin only. */
async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  return ok(res, { data: user });
}

/** PATCH /users/me — update own profile. */
async function updateMe(req, res) {
  const allowed = ['name', 'bio', 'avatar'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  }
  await req.user.save();
  return ok(res, { message: 'Profile updated', data: { user: req.user } });
}

/** PATCH /users/me/password — verify current, set new, revoke all sessions. */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  await revokeAllUserTokens(user._id);
  return ok(res, { message: 'Password changed — all sessions revoked, please log in again' });
}

/** PATCH /users/:id/role — admin only. */
async function setRole(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot change your own role');
  user.role = req.body.role;
  await user.save();
  return ok(res, { message: `Role set to '${user.role}'`, data: user });
}

/** PATCH /users/:id/status — admin only; deactivation also kills sessions. */
async function setStatus(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot deactivate your own account');
  user.isActive = req.body.isActive;
  await user.save();
  if (!user.isActive) await revokeAllUserTokens(user._id);
  return ok(res, { message: user.isActive ? 'Account activated' : 'Account deactivated', data: user });
}

module.exports = { listUsers, getUser, updateMe, changePassword, setRole, setStatus };

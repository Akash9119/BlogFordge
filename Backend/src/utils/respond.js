/**
 * Standardized success envelope used by every endpoint:
 * { success, message, data, meta? }
 */
function ok(res, { status = 200, message = 'OK', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, opts = {}) {
  return ok(res, { status: 201, message: 'Created', ...opts });
}

module.exports = { ok, created };

/**
 * Parse `page` / `limit` query params with sane bounds.
 */
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Resolve a `sort` query param against a whitelist.
 * Accepts "field" or "-field"; anything not whitelisted falls back to the default.
 */
function parseSort(sortParam, allowedFields, defaultSort) {
  if (typeof sortParam !== 'string' || sortParam.length === 0) return defaultSort;
  const field = sortParam.startsWith('-') ? sortParam.slice(1) : sortParam;
  if (!allowedFields.includes(field)) return defaultSort;
  return sortParam;
}

module.exports = { parsePagination, buildMeta, parseSort };

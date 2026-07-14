const slugify = require('slugify');

/**
 * Generate a URL-safe slug from `text`, guaranteed unique within `Model`.
 * Appends -2, -3, ... on collision. `excludeId` skips the document being updated.
 */
async function generateUniqueSlug(Model, text, excludeId) {
  const base = slugify(text, { lower: true, strict: true, trim: true }).slice(0, 96) || 'item';
  let slug = base;
  let counter = 1;
  const query = () => (excludeId ? { slug, _id: { $ne: excludeId } } : { slug });
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists(query())) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}

module.exports = { generateUniqueSlug };

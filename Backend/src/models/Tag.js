const mongoose = require('mongoose');
const { generateUniqueSlug } = require('../utils/slug');

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 40 },
    slug: { type: String, unique: true, index: true },
  },
  { timestamps: true }
);

tagSchema.pre('validate', async function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = await generateUniqueSlug(this.constructor, this.name, this._id);
  }
});

module.exports = mongoose.model('Tag', tagSchema);

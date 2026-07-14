const mongoose = require('mongoose');
const { generateUniqueSlug } = require('../utils/slug');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

categorySchema.pre('validate', async function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = await generateUniqueSlug(this.constructor, this.name, this._id);
  }
});

module.exports = mongoose.model('Category', categorySchema);

const mongoose = require('mongoose');
const { generateUniqueSlug } = require('../utils/slug');

const STATUSES = ['draft', 'published', 'archived'];

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    slug: { type: String, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: { type: String, trim: true, maxlength: 300, default: '' },
    coverImage: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    readingTime: { type: Number, default: 1 }, // minutes
    viewCount: { type: Number, default: 0 },
    seo: {
      metaTitle: { type: String, maxlength: 70, default: '' },
      metaDescription: { type: String, maxlength: 160, default: '' },
    },
  },
  { timestamps: true }
);

postSchema.index({ title: 'text', excerpt: 'text', content: 'text' }, { weights: { title: 5, excerpt: 3, content: 1 } });
postSchema.index({ status: 1, publishedAt: -1 });

postSchema.pre('validate', async function () {
  if (this.isModified('title') || !this.slug) {
    this.slug = await generateUniqueSlug(this.constructor, this.title, this._id);
  }
  if (this.isModified('content')) {
    const words = this.content.trim().split(/\s+/).length;
    this.readingTime = Math.max(1, Math.round(words / 200));
    if (!this.excerpt) {
      this.excerpt = this.content.replace(/\s+/g, ' ').trim().slice(0, 297).concat('...');
    }
  }
});

const Post = mongoose.model('Post', postSchema);
Post.STATUSES = STATUSES;

module.exports = Post;

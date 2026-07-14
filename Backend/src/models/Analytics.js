const mongoose = require('mongoose');

/**
 * Per-post engagement, rolled up per UTC day.
 * One document per (post, date) pair — incremented atomically via upsert.
 */
const analyticsSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    date: { type: Date, required: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

analyticsSchema.index({ post: 1, date: 1 }, { unique: true });
analyticsSchema.index({ date: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

const mongoose = require('mongoose');

const STATUSES = ['pending', 'approved', 'rejected'];

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, status: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);
Comment.STATUSES = STATUSES;

module.exports = Comment;

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const { isStaff } = require('../middleware/auth');
const Analytics = require('../models/Analytics');
const Post = require('../models/Post');

const startOfUtcDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

function parseDateRange(query, defaultDays = 30) {
  const to = query.to ? new Date(query.to) : startOfUtcDay();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - defaultDays * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError(400, "Invalid 'from'/'to' date — use ISO format (YYYY-MM-DD)");
  }
  return { from, to };
}

/** POST /posts/:postId/views — public, rate-limited. Atomic daily rollup upsert. */
async function recordView(req, res) {
  const post = await Post.findOne({ _id: req.params.postId, status: 'published' });
  if (!post) throw new ApiError(404, 'Post not found');

  await Promise.all([
    Analytics.updateOne(
      { post: post._id, date: startOfUtcDay() },
      { $inc: { views: 1 } },
      { upsert: true }
    ),
    Post.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } }),
  ]);
  return ok(res, { message: 'View recorded' });
}

/** GET /analytics/overview — editor/admin (enforced in routes). */
async function overview(req, res) {
  const { from, to } = parseDateRange(req.query);

  const [byStatus, totals, topPosts, dailyViews] = await Promise.all([
    Post.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Post.aggregate([{ $group: { _id: null, totalViews: { $sum: '$viewCount' } } }]),
    Post.find({ status: 'published' })
      .sort('-viewCount')
      .limit(5)
      .select('title slug viewCount publishedAt')
      .populate('author', 'name'),
    Analytics.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$date', views: { $sum: '$views' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', views: 1 } },
    ]),
  ]);

  const postsByStatus = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  return ok(res, {
    data: {
      range: { from, to },
      postsByStatus,
      totalViews: totals[0]?.totalViews || 0,
      topPosts,
      dailyViews,
    },
  });
}

/** GET /analytics/posts/:postId — staff, or the post's own author. */
async function postAnalytics(req, res) {
  if (!mongoose.isValidObjectId(req.params.postId)) throw new ApiError(400, 'Invalid post id');
  const post = await Post.findById(req.params.postId).select('title slug status viewCount author publishedAt');
  if (!post) throw new ApiError(404, 'Post not found');
  if (!isStaff(req.user) && !post.author.equals(req.user._id)) {
    throw new ApiError(403, 'You can only view analytics for your own posts');
  }

  const { from, to } = parseDateRange(req.query);
  const daily = await Analytics.aggregate([
    { $match: { post: post._id, date: { $gte: from, $lte: to } } },
    { $sort: { date: 1 } },
    { $project: { _id: 0, date: 1, views: 1 } },
  ]);

  return ok(res, { data: { post, range: { from, to }, daily } });
}

module.exports = { recordView, overview, postAnalytics };

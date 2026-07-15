const { Router } = require('express');
const posts = require('../controllers/post.controller');
const comments = require('../controllers/comment.controller');
const analytics = require('../controllers/analytics.controller');
const validate = require('../middleware/validate');
const postRules = require('../validators/post.validators');
const commentRules = require('../validators/comment.validators');
const { requireAuth, optionalAuth, requireRoles } = require('../middleware/auth');
const { viewLimiter } = require('../middleware/rateLimiters');

const router = Router();

// Listing & detail (visibility rules applied in the controller)
router.get('/', optionalAuth, posts.listPosts);
router.get('/:idOrSlug', optionalAuth, posts.getPost);

// Authoring
router.post('/', requireAuth, validate(postRules.create), posts.createPost);
router.patch('/:id', requireAuth, validate(postRules.update), posts.updatePost);
router.delete('/:id', requireAuth, posts.deletePost);

// Publish workflow — editors and admins only
router.patch('/:id/publish', requireAuth, requireRoles('admin', 'editor'), posts.publishPost);
router.patch('/:id/archive', requireAuth, requireRoles('admin', 'editor'), posts.archivePost);

// Engagement
router.post('/:postId/views', viewLimiter, analytics.recordView);

// Comments (nested)
router.get('/:postId/comments', optionalAuth, comments.listComments);
router.post('/:postId/comments', requireAuth, validate(commentRules.create), comments.createComment);

module.exports = router;

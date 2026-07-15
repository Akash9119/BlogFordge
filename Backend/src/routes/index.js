const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/posts', require('./post.routes'));
router.use('/categories', require('./category.routes'));
router.use('/tags', require('./tag.routes'));
router.use('/comments', require('./comment.routes'));
router.use('/media', require('./media.routes'));
router.use('/analytics', require('./analytics.routes'));

module.exports = router;

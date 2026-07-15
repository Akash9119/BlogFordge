const { Router } = require('express');
const controller = require('../controllers/analytics.controller');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);

router.get('/overview', requireRoles('admin', 'editor'), controller.overview);
router.get('/posts/:postId', controller.postAnalytics); // staff or the post's author (checked in controller)

module.exports = router;

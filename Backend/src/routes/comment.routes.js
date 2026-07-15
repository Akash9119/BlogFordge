const { Router } = require('express');
const controller = require('../controllers/comment.controller');
const validate = require('../middleware/validate');
const rules = require('../validators/comment.validators');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = Router();

router.patch('/:id/moderate', requireAuth, requireRoles('admin', 'editor'), validate(rules.moderate), controller.moderateComment);
router.delete('/:id', requireAuth, controller.deleteComment);

module.exports = router;

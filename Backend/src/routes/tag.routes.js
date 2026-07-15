const { Router } = require('express');
const controller = require('../controllers/tag.controller');
const validate = require('../middleware/validate');
const rules = require('../validators/taxonomy.validators');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = Router();

router.get('/', controller.listTags);

router.post('/', requireAuth, requireRoles('admin', 'editor'), validate(rules.tag), controller.createTag);
router.patch('/:id', requireAuth, requireRoles('admin', 'editor'), validate(rules.tag), controller.updateTag);
router.delete('/:id', requireAuth, requireRoles('admin', 'editor'), controller.deleteTag);

module.exports = router;

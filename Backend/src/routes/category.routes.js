const { Router } = require('express');
const controller = require('../controllers/category.controller');
const validate = require('../middleware/validate');
const rules = require('../validators/taxonomy.validators');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = Router();

router.get('/', controller.listCategories);
router.get('/:slug', controller.getCategory);

router.post('/', requireAuth, requireRoles('admin', 'editor'), validate(rules.category), controller.createCategory);
router.patch('/:id', requireAuth, requireRoles('admin', 'editor'), validate(rules.categoryUpdate), controller.updateCategory);
router.delete('/:id', requireAuth, requireRoles('admin', 'editor'), controller.deleteCategory);

module.exports = router;

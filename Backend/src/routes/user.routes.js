const { Router } = require('express');
const controller = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const rules = require('../validators/user.validators');
const authRules = require('../validators/auth.validators');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = Router();

router.use(requireAuth);

router.patch('/me', validate(rules.updateMe), controller.updateMe);
router.patch('/me/password', validate(authRules.changePassword), controller.changePassword);

router.get('/', requireRoles('admin'), controller.listUsers);
router.get('/:id', requireRoles('admin'), controller.getUser);
router.patch('/:id/role', requireRoles('admin'), validate(rules.setRole), controller.setRole);
router.patch('/:id/status', requireRoles('admin'), validate(rules.setStatus), controller.setStatus);

module.exports = router;

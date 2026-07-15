const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const rules = require('../validators/auth.validators');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

const router = Router();

router.post('/register', authLimiter, validate(rules.register), controller.register);
router.post('/login', authLimiter, validate(rules.login), controller.login);
router.post('/refresh', authLimiter, validate(rules.refresh), controller.refresh);
router.post('/logout', validate(rules.refresh), controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;

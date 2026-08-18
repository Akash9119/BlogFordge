const { Router } = require('express');
const controller = require('../controllers/ai.controller');
const validate = require('../middleware/validate');
const aiRules = require('../validators/ai.validators');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { aiLimiter, aiDailyLimiter } = require('../middleware/rateLimiters');

const router = Router();

router.use(requireAuth);

// Cheap and read-only — the UI polls it to decide what to render.
router.get('/status', controller.status);

// Both of these spend money per call, so they get their own budget: a burst cap
// per hour and the ceiling that actually bounds a month's bill per day.
router.post('/reports', aiDailyLimiter, aiLimiter, validate(aiRules.report), controller.createReport);
router.post('/assist', aiDailyLimiter, aiLimiter, validate(aiRules.assist), controller.assist);

// Re-embeds the whole corpus — admin only.
router.post('/reindex', requireRoles('admin'), validate(aiRules.reindex), controller.reindex);

module.exports = router;

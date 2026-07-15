const { Router } = require('express');
const controller = require('../controllers/media.controller');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();

router.use(requireAuth);

router.post('/', upload.single('file'), controller.uploadMedia);
router.get('/', controller.listMedia);
router.delete('/:id', controller.deleteMedia);

module.exports = router;

const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(new ApiError(400, `Unsupported file type '${file.mimetype}'. Allowed: jpeg, png, webp, gif, svg`));
  },
});

module.exports = upload;

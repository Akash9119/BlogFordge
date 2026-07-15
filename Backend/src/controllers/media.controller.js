const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { isStaff } = require('../middleware/auth');
const Media = require('../models/Media');

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
}

/** POST /media — multipart field `file`. */
async function uploadMedia(req, res) {
  if (!req.file) throw new ApiError(400, "No file uploaded — send it as multipart field 'file'");

  const result = await uploadBuffer(req.file.buffer, {
    folder: 'blogforge',
    resource_type: 'image',
  });

  const media = await Media.create({
    uploadedBy: req.user._id,
    publicId: result.public_id,
    url: result.secure_url,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    originalName: req.file.originalname,
  });
  return created(res, { message: 'File uploaded', data: media });
}

/** GET /media — own uploads; staff see everything. */
async function listMedia(req, res) {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = isStaff(req.user) ? {} : { uploadedBy: req.user._id };

  const [items, total] = await Promise.all([
    Media.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('uploadedBy', 'name'),
    Media.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
}

/** DELETE /media/:id — own upload or admin; removes from Cloudinary too. */
async function deleteMedia(req, res) {
  const media = await Media.findById(req.params.id);
  if (!media) throw new ApiError(404, 'Media not found');
  if (req.user.role !== 'admin' && !media.uploadedBy.equals(req.user._id)) {
    throw new ApiError(403, 'You can only delete your own uploads');
  }
  await cloudinary.uploader.destroy(media.publicId, { resource_type: media.resourceType });
  await media.deleteOne();
  return ok(res, { message: 'Media deleted' });
}

module.exports = { uploadMedia, listMedia, deleteMedia };

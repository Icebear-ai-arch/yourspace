const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '..', 'uploads');
const supportedMedia = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
]);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDirectory),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

function mediaFileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (supportedMedia.get(extension) !== file.mimetype) {
    const error = new Error('Choose a JPG, PNG, GIF, WEBP, MP4, or WEBM file.');
    error.statusCode = 415;
    callback(error);
    return;
  }
  callback(null, true);
}

function profilePictureFileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = supportedMedia.get(extension);
  if (!mimeType || !mimeType.startsWith('image/') || mimeType !== file.mimetype) {
    const error = new Error('Choose a JPG, PNG, GIF, or WEBP image.');
    error.statusCode = 415;
    callback(error);
    return;
  }
  callback(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: mediaFileFilter,
});

const uploadProfilePicture = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 2,
    parts: 3,
  },
  fileFilter: profilePictureFileFilter,
});

function presentMedia(record) {
  const result = record.toJSON();
  if (result.mediaPath) {
    result.mediaUrl = `/media/${encodeURIComponent(result.mediaPath)}`;
  } else {
    result.mediaUrl = null;
  }
  delete result.mediaPath;
  return result;
}

async function removeMedia(filename) {
  if (!filename || path.basename(filename) !== filename) {
    return;
  }

  try {
    await fs.promises.unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = { upload, uploadProfilePicture, uploadDirectory, presentMedia, removeMedia };

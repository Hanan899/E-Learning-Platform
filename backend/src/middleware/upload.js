const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');

const uploadDir = path.resolve(
  __dirname,
  '../../',
  process.env.UPLOAD_DIR || 'uploads'
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const sanitizeFilename = (originalName = 'file') => {
  const { name, ext } = path.parse(originalName);
  const sanitizedBaseName =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';
  const sanitizedExtension = ext.toLowerCase().replace(/[^.a-z0-9]/g, '');

  return `${sanitizedBaseName}${sanitizedExtension}`;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const sanitizedName = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}-${sanitizedName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Only pdf, jpg, jpeg, png, and docx files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const uploadSingle = (fieldName = 'file') => upload.single(fieldName);
const uploadMultiple = (fieldName = 'files') => upload.array(fieldName, 5);

module.exports = {
  uploadSingle,
  uploadMultiple,
};

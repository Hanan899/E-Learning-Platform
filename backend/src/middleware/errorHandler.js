const { ValidationError } = require('sequelize');
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Uploaded file exceeds the 10MB size limit',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 ? 'Internal server error' : err.message || 'Request failed';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;

const {
  ValidationError,
  UniqueConstraintError,
} = require('sequelize');
const multer = require('multer');
const { TokenExpiredError } = require('jsonwebtoken');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large (max 10MB)',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Session expired, please login again',
    });
  }

  if (err instanceof UniqueConstraintError) {
    const emailViolation = err.errors?.some((issue) => issue.path === 'email');

    return res.status(400).json({
      success: false,
      message: emailViolation ? 'Email already exists' : 'A unique field already exists',
      ...(err.errors?.length
        ? {
            errors: err.errors.map((issue) => ({
              field: issue.path,
              message: issue.message,
            })),
          }
        : {}),
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
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

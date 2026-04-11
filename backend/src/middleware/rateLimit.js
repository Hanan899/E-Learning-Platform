const rateLimit = require('express-rate-limit');

const isTestEnvironment = process.env.NODE_ENV === 'test';

const createLimiter = (max, message, options = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestEnvironment ? Math.max(max, 1000) : max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
      success: false,
      message,
    },
    ...options,
  });

const authLimiter = createLimiter(10, 'Too many authentication attempts. Please try again in 15 minutes.');
const apiLimiter = createLimiter(100, 'Too many requests. Please slow down and try again shortly.', {
  skip: (req) => req.path === '/health' || req.path.startsWith('/auth'),
});

module.exports = {
  authLimiter,
  apiLimiter,
};

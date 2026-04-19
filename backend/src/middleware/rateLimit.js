const rateLimit = require('express-rate-limit');

const isTestEnvironment = process.env.NODE_ENV === 'test';

const createLimiter = (max, options = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestEnvironment ? Math.max(max, 1000) : max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    ...options,
  });

const apiLimiter = createLimiter(100, {
  skip: (req) => req.path === '/health' || req.path.startsWith('/auth'),
});

module.exports = {};
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { error } = require('../utils/responseHelper');

const USER_ROLES = ['admin', 'teacher', 'student'];

const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return error(res, 'Authentication token is required', 401);
    }

    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id || decoded.sub);

    if (!user || !user.isActive) {
      return error(res, 'User is not authorized to access this resource', 401);
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return error(res, 'Invalid or expired authentication token', 401);
    }

    return next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return error(res, 'Unauthorized', 401);
  }

  if (!roles.includes(req.user.role)) {
    return error(res, 'Forbidden', 403);
  }

  return next();
};

module.exports = {
  authenticate,
  authorize,
  USER_ROLES,
};

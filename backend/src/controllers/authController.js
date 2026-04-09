const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { success, error } = require('../utils/responseHelper');

const serializeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive,
});

const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const login = async (req, res, next) => {
  try {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return error(res, 'Validation failed', 422, validationErrors.array());
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.isPasswordValid(password))) {
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account is inactive', 403);
    }

    return success(
      res,
      {
        token: signToken(user),
        user: serializeUser(user),
      },
      'Login successful'
    );
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res) => success(res, { user: serializeUser(req.user) });

module.exports = {
  login,
  me,
};

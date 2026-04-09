const jwt = require('jsonwebtoken');

const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const serializeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

module.exports = {
  passwordRegex,
  normalizeEmail,
  serializeUser,
  signToken,
};

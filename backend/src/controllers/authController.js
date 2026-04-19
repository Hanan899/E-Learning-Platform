const { Op, fn, col, where } = require('sequelize');
const { User } = require('../models');
const { success, error } = require('../utils/responseHelper');
const { createNotification, createNotifications } = require('../utils/notificationService');
const {
  normalizeEmail,
  passwordRegex,
  serializeUser,
  signToken,
} = require('../utils/authHelpers');

const findUserByEmail = (email) =>
  User.findOne({
    where: where(fn('LOWER', col('email')), {
      [Op.eq]: normalizeEmail(email),
    }),
  });

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const requestedRole = req.body.role === 'teacher' ? 'teacher' : 'student';

    if (!passwordRegex.test(password)) {
      return error(
        res,
        'Password must be at least 8 characters and include 1 uppercase letter and 1 number',
        400
      );
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return error(res, 'Email already exists', 400);
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password,
      role: requestedRole,
    });

    await createNotification(user.id, {
      title: 'Welcome to EduFlow',
      message:
        requestedRole === 'teacher'
          ? 'Your teacher account is ready. An admin has been notified to review your registration.'
          : 'Your student account is ready. Start exploring available courses.',
      type: 'announcement',
    });

    if (requestedRole === 'teacher') {
      const admins = await User.findAll({
        where: {
          role: 'admin',
          isActive: true,
        },
        attributes: ['id'],
      });

      await createNotifications(
        admins.map((adminUser) => adminUser.id),
        {
          title: 'New teacher registration',
          message: `${user.firstName} ${user.lastName} (${user.email}) registered as a teacher. Please verify this account from User Management.`,
          type: 'announcement',
        }
      );
    }

    return success(
      res,
      {
        token: signToken(user),
        user: serializeUser(user),
      },
      'Registration successful',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);

    if (!user || !(await user.isPasswordValid(password))) {
      return error(res, 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account deactivated', 403);
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

const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, { user: serializeUser(user) });
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    const updates = {};

    if (typeof req.body.firstName === 'string') {
      updates.firstName = req.body.firstName.trim();
    }

    if (typeof req.body.lastName === 'string') {
      updates.lastName = req.body.lastName.trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
      updates.avatar = req.body.avatar ? String(req.body.avatar).trim() : null;
    }

    await user.update(updates);

    return success(res, { user: serializeUser(user) }, 'Profile updated successfully');
  } catch (err) {
    return next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (!(await user.isPasswordValid(currentPassword))) {
      return error(res, 'Current password is incorrect', 400);
    }

    if (!passwordRegex.test(newPassword)) {
      return error(
        res,
        'Password must be at least 8 characters and include 1 uppercase letter and 1 number',
        400
      );
    }

    user.password = newPassword;
    await user.save();

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};

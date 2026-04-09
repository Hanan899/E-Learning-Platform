const { Op, fn, col, where } = require('sequelize');
const { Course, Enrollment, User } = require('../models');
const { error, paginate, success } = require('../utils/responseHelper');
const { normalizeEmail, serializeUser } = require('../utils/authHelpers');

const buildSearchWhere = (search) => {
  if (!search) {
    return {};
  }

  const pattern = `%${search.trim().toLowerCase()}%`;

  return {
    [Op.or]: [
      where(fn('LOWER', col('firstName')), { [Op.like]: pattern }),
      where(fn('LOWER', col('lastName')), { [Op.like]: pattern }),
      where(fn('LOWER', col('email')), { [Op.like]: pattern }),
    ],
  };
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    const whereClause = {
      ...(role ? { role } : {}),
      ...buildSearchWhere(search),
    };

    const { rows, count } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return paginate(res, { users: rows.map(serializeUser) }, count, page, limit);
  } catch (err) {
    return next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (user.id === req.user.id) {
      return error(res, 'You cannot change your own role', 400);
    }

    user.role = req.body.role;
    await user.save();

    return success(res, { user: serializeUser(user) }, 'User role updated successfully');
  } catch (err) {
    return next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (user.id === req.user.id) {
      return error(res, 'You cannot deactivate your own account', 400);
    }

    user.isActive = !user.isActive;
    await user.save();

    return success(res, { user: serializeUser(user) }, 'User status updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (user.id === req.user.id) {
      return error(res, 'You cannot deactivate your own account', 400);
    }

    user.isActive = false;
    await user.save();

    return success(res, { user: serializeUser(user) }, 'User deactivated successfully');
  } catch (err) {
    return next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalStudents, totalTeachers, totalAdmins, totalCourses, totalEnrollments] =
      await Promise.all([
        User.count({ where: { role: 'student' } }),
        User.count({ where: { role: 'teacher' } }),
        User.count({ where: { role: 'admin' } }),
        Course.count(),
        Enrollment.count(),
      ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentSignups, recentUsers] = await Promise.all([
      User.count({
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
      }),
      User.findAll({
        attributes: { exclude: ['password'] },
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
    ]);

    return success(res, {
      totals: {
        usersByRole: {
          admin: totalAdmins,
          teacher: totalTeachers,
          student: totalStudents,
        },
        totalCourses,
        totalEnrollments,
        recentSignups,
      },
      recentUsers: recentUsers.map(serializeUser),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
};

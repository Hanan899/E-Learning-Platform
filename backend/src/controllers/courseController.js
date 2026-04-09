const { Course, User } = require('../models');
const { success } = require('../utils/responseHelper');

const listCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return success(res, { courses });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listCourses,
};

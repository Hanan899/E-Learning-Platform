const fs = require('fs');
const path = require('path');
const { Op, fn, col, where } = require('sequelize');
const {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Material,
  Quiz,
  Section,
  User,
} = require('../models');
const { error, paginate, success } = require('../utils/responseHelper');
const {
  ensureCourseOwnership,
  getUploadUrl,
  serializeMaterial,
} = require('../utils/courseHelpers');
const { createNotification } = require('../utils/notificationService');

const getSearchFilter = (search) => {
  if (!search) {
    return {};
  }

  const pattern = `%${String(search).trim().toLowerCase()}%`;

  return {
    [Op.or]: [
      where(fn('LOWER', col('Course.title')), { [Op.like]: pattern }),
      where(fn('LOWER', col('Course.description')), { [Op.like]: pattern }),
      where(fn('LOWER', col('Course.category')), { [Op.like]: pattern }),
    ],
  };
};

const serializeCourseSummary = async (course, currentUser) => {
  const [enrollmentCount, lessonCount, currentEnrollment] = await Promise.all([
    Enrollment.count({ where: { courseId: course.id } }),
    Lesson.count({ where: { courseId: course.id } }),
    currentUser?.role === 'student'
      ? Enrollment.findOne({
          where: { courseId: course.id, studentId: currentUser.id },
        })
      : null,
  ]);

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    thumbnailUrl: getUploadUrl(course.thumbnail),
    category: course.category,
    isPublished: course.isPublished,
    teacherId: course.teacherId,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    teacher: course.teacher
      ? {
          id: course.teacher.id,
          firstName: course.teacher.firstName,
          lastName: course.teacher.lastName,
          fullName: `${course.teacher.firstName} ${course.teacher.lastName}`,
        }
      : null,
    enrollmentCount,
    lessonCount,
    isEnrolled: Boolean(currentEnrollment),
    progressPercentage: currentEnrollment?.completionPercentage ?? 0,
  };
};

const createCourse = async (req, res, next) => {
  try {
    const teacherId = req.user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.user.id;

    const course = await Course.create({
      title: req.body.title.trim(),
      description: req.body.description?.trim() || null,
      category: req.body.category?.trim() || null,
      teacherId,
      thumbnail: req.file?.path || null,
    });

    const createdCourse = await Course.findByPk(course.id, {
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
    });

    return success(
      res,
      { course: await serializeCourseSummary(createdCourse, req.user) },
      'Course created successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const getAllCourses = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const { category, search } = req.query;

    const whereClause = {
      ...(category ? { category } : {}),
      ...getSearchFilter(search),
    };

    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    }

    if (req.user.role === 'student') {
      whereClause.isPublished = true;
    }

    const { rows, count } = await Course.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      distinct: true,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const courses = await Promise.all(rows.map((course) => serializeCourseSummary(course, req.user)));

    const sortedCourses =
      req.user.role === 'student'
        ? [...courses].sort((a, b) => Number(b.isEnrolled) - Number(a.isEnrolled))
        : courses;

    return paginate(res, { courses: sortedCourses }, count, page, limit);
  } catch (err) {
    return next(err);
  }
};

const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Section,
          as: 'sections',
          separate: true,
          order: [['order', 'ASC']],
          include: [
            {
              model: Lesson,
              as: 'lessons',
              separate: true,
              order: [['order', 'ASC']],
              include: [
                {
                  model: Material,
                  as: 'materials',
                },
              ],
            },
          ],
        },
        {
          model: Assignment,
          as: 'assignments',
        },
        {
          model: Quiz,
          as: 'quizzes',
        },
      ],
    });

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    const enrollment =
      req.user.role === 'student'
        ? await Enrollment.findOne({
            where: { courseId: course.id, studentId: req.user.id },
          })
        : null;

    if (req.user.role === 'student' && !course.isPublished) {
      return error(res, 'This course is currently unavailable to students', 403);
    }

    const sections = course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      courseId: section.courseId,
      lessons: (section.lessons || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        order: lesson.order,
        sectionId: lesson.sectionId,
        courseId: lesson.courseId,
        materials: (lesson.materials || []).map(serializeMaterial),
      })),
    }));

    let studentProgress = null;
    if (req.user.role === 'student') {
      const completedLessons = await LessonProgress.findAll({
        where: { studentId: req.user.id, courseId: course.id },
        attributes: ['lessonId'],
      });
      studentProgress = {
        isEnrolled: Boolean(enrollment),
        completionPercentage: enrollment?.completionPercentage ?? 0,
        completedLessonIds: completedLessons.map((entry) => entry.lessonId),
      };
    }

    return success(res, {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        thumbnailUrl: getUploadUrl(course.thumbnail),
        category: course.category,
        isPublished: course.isPublished,
        teacherId: course.teacherId,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        teacher: course.teacher,
        sections,
        assignments: course.assignments,
        quizzes: course.quizzes,
        studentProgress,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { course } = ownership;
    const previousThumbnail = course.thumbnail;

    await course.update({
      title: req.body.title?.trim() || course.title,
      description:
        Object.prototype.hasOwnProperty.call(req.body, 'description')
          ? req.body.description?.trim() || null
          : course.description,
      category:
        Object.prototype.hasOwnProperty.call(req.body, 'category')
          ? req.body.category?.trim() || null
          : course.category,
      thumbnail: req.file?.path || course.thumbnail,
    });

    if (req.file?.path && previousThumbnail && previousThumbnail !== req.file.path && fs.existsSync(previousThumbnail)) {
      fs.unlinkSync(previousThumbnail);
    }

    const updatedCourse = await Course.findByPk(course.id, {
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
    });

    return success(res, {
      course: await serializeCourseSummary(updatedCourse, req.user),
    }, 'Course updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { course } = ownership;
    if (course.thumbnail && fs.existsSync(course.thumbnail)) {
      fs.unlinkSync(course.thumbnail);
    }

    await course.destroy();

    return success(res, null, 'Course deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const publishCourse = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    if (req.user.role !== 'teacher') {
      return error(res, 'Only teachers can publish courses', 403);
    }

    const { course } = ownership;
    course.isPublished = !course.isPublished;
    await course.save();

    return success(
      res,
      {
        course: {
          id: course.id,
          isPublished: course.isPublished,
        },
      },
      course.isPublished ? 'Course published successfully' : 'Course unpublished successfully'
    );
  } catch (err) {
    return next(err);
  }
};

const enrollStudent = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    if (!course.isPublished) {
      return error(res, 'Only published courses can be enrolled', 400);
    }

    const existingEnrollment = await Enrollment.findOne({
      where: { courseId: course.id, studentId: req.user.id },
    });

    if (existingEnrollment) {
      return error(res, 'Already enrolled', 400);
    }

    const enrollment = await Enrollment.create({
      studentId: req.user.id,
      courseId: course.id,
      enrolledAt: new Date(),
    });

    await createNotification(req.user.id, {
      title: 'Course enrollment confirmed',
      message: `Welcome to ${course.title}!`,
      type: 'enrollment',
    });

    return success(res, { enrollment }, 'Enrollment successful', 201);
  } catch (err) {
    return next(err);
  }
};

const unenrollStudent = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findOne({
      where: { courseId: req.params.id, studentId: req.user.id },
    });

    if (!enrollment) {
      return error(res, 'Enrollment not found', 404);
    }

    await LessonProgress.destroy({
      where: { courseId: req.params.id, studentId: req.user.id },
    });
    await enrollment.destroy();

    return success(res, null, 'Unenrolled successfully');
  } catch (err) {
    return next(err);
  }
};

const getEnrolledStudents = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const enrollments = await Enrollment.findAll({
      where: { courseId: req.params.id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'isActive', 'createdAt'],
        },
      ],
      order: [['enrolledAt', 'DESC']],
    });

    return success(res, {
      students: enrollments.map((entry) => ({
        id: entry.student.id,
        firstName: entry.student.firstName,
        lastName: entry.student.lastName,
        email: entry.student.email,
        avatar: entry.student.avatar,
        isActive: entry.student.isActive,
        enrolledAt: entry.enrolledAt,
        progressPercentage: entry.completionPercentage,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
};

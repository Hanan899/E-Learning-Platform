const fs = require('fs');
const { Op, col, fn, where } = require('sequelize');
const {
  Assignment,
  Course,
  Enrollment,
  LessonProgress,
  Material,
  Notification,
  Quiz,
  QuizAttempt,
  Submission,
  User,
} = require('../models');
const { error, paginate, success } = require('../utils/responseHelper');
const { serializeUser } = require('../utils/authHelpers');
const { getUploadUrl } = require('../utils/courseHelpers');
const { buildCourseAnalytics, buildCourseGradebook } = require('./teacherController');

const round = (value) => Number(Number(value || 0).toFixed(2));
const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
const removeFiles = (filePaths = []) => {
  const uniquePaths = [...new Set(filePaths.filter(Boolean))];

  uniquePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

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

const buildCourseSearchWhere = (search) => {
  if (!search) {
    return null;
  }

  const pattern = `%${String(search).trim().toLowerCase()}%`;
  return where(fn('LOWER', col('title')), { [Op.like]: pattern });
};

const getWeekStart = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const buildScoreBucket = (score) => {
  if (score >= 90) {
    return 'A';
  }
  if (score >= 80) {
    return 'B';
  }
  if (score >= 70) {
    return 'C';
  }
  if (score >= 60) {
    return 'D';
  }
  return 'F';
};

const buildRecentActivity = async (limit = 50) => {
  const [recentUsers, recentEnrollments, recentSubmissions, recentQuizAttempts, gradeNotifications] = await Promise.all([
    User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
    }),
    Enrollment.findAll({
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title'],
        },
      ],
      order: [['enrolledAt', 'DESC']],
      limit,
    }),
    Submission.findAll({
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'courseId'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title'],
            },
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit,
    }),
    QuizAttempt.findAll({
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'courseId'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title'],
            },
          ],
        },
      ],
      order: [['completedAt', 'DESC']],
      limit,
    }),
    Notification.findAll({
      where: { type: 'grade' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    }),
  ]);

  const events = [
    ...recentUsers.map((user) => ({
      id: `user:${user.id}:${user.createdAt}`,
      type: 'signup',
      timestamp: user.createdAt,
      actor: {
        id: user.id,
        name: getFullName(user),
        email: user.email || null,
      },
      description: `${getFullName(user)} joined the platform as a ${user.role}.`,
      course: null,
    })),
    ...recentEnrollments.map((enrollment) => ({
      id: `enrollment:${enrollment.id}`,
      type: 'enrollment',
      timestamp: enrollment.enrolledAt,
      actor: {
        id: enrollment.student.id,
        name: getFullName(enrollment.student),
        email: enrollment.student.email,
      },
      description: `${getFullName(enrollment.student)} enrolled in ${enrollment.course?.title || 'a course'}.`,
      course: enrollment.course ? { id: enrollment.course.id, title: enrollment.course.title } : null,
    })),
    ...recentSubmissions.map((submission) => ({
      id: `submission:${submission.id}`,
      type: submission.status === 'graded' ? 'submission_graded' : 'submission',
      timestamp: submission.submittedAt,
      actor: {
        id: submission.student.id,
        name: getFullName(submission.student),
        email: submission.student.email,
      },
      description: `${getFullName(submission.student)} submitted ${submission.assignment?.title || 'an assignment'}.`,
      course: submission.assignment?.course
        ? { id: submission.assignment.course.id, title: submission.assignment.course.title }
        : null,
    })),
    ...recentQuizAttempts.map((attempt) => ({
      id: `quiz:${attempt.id}`,
      type: 'quiz_attempt',
      timestamp: attempt.completedAt,
      actor: {
        id: attempt.student.id,
        name: getFullName(attempt.student),
        email: attempt.student.email,
      },
      description: `${getFullName(attempt.student)} completed ${attempt.quiz?.title || 'a quiz'} with ${attempt.score}%.`,
      course: attempt.quiz?.course ? { id: attempt.quiz.course.id, title: attempt.quiz.course.title } : null,
    })),
    ...gradeNotifications.map((notification) => ({
      id: `grade:${notification.id}`,
      type: 'grade',
      timestamp: notification.createdAt,
      actor: {
        id: notification.user.id,
        name: getFullName(notification.user),
        email: notification.user.email,
      },
      description: notification.message,
      course: null,
    })),
  ];

  return events
    .filter((event) => event.timestamp)
    .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp))
    .slice(0, limit);
};

const buildStudentReportData = async (studentId) => {
  const student = await User.findByPk(studentId, {
    attributes: { exclude: ['password'] },
  });

  if (!student || student.role !== 'student') {
    return null;
  }

  const enrollments = await Enrollment.findAll({
    where: { studentId },
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'category', 'teacherId', 'isPublished'],
        include: [
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
      },
    ],
    order: [['enrolledAt', 'DESC']],
  });

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  const [assignments, submissions, quizAttempts, lessonProgressEntries] = await Promise.all([
    courseIds.length
      ? Assignment.findAll({
          where: { courseId: { [Op.in]: courseIds } },
          attributes: ['id', 'title', 'courseId', 'maxScore', 'dueDate', 'description'],
          order: [['dueDate', 'ASC']],
        })
      : [],
    Submission.findAll({
      where: { studentId },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'courseId', 'maxScore'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title', 'category'],
            },
          ],
        },
      ],
      order: [['submittedAt', 'DESC']],
    }),
    QuizAttempt.findAll({
      where: { studentId },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'courseId'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title', 'category'],
            },
          ],
        },
      ],
      order: [['completedAt', 'DESC']],
    }),
    LessonProgress.findAll({
      where: { studentId, ...(courseIds.length ? { courseId: { [Op.in]: courseIds } } : {}) },
      attributes: ['id', 'courseId', 'lessonId', 'completedAt'],
    }),
  ]);

  const assignmentsByCourseId = assignments.reduce((map, assignment) => {
    if (!map.has(assignment.courseId)) {
      map.set(assignment.courseId, []);
    }
    map.get(assignment.courseId).push(assignment);
    return map;
  }, new Map());

  const submissionsByAssignmentId = new Map(submissions.map((submission) => [submission.assignmentId, submission]));
  const attemptsByCourseId = quizAttempts.reduce((map, attempt) => {
    const courseId = attempt.quiz?.courseId;
    if (!courseId) {
      return map;
    }
    if (!map.has(courseId)) {
      map.set(courseId, []);
    }
    map.get(courseId).push(attempt);
    return map;
  }, new Map());

  const progressByCourseId = lessonProgressEntries.reduce((map, entry) => {
    if (!map.has(entry.courseId)) {
      map.set(entry.courseId, []);
    }
    map.get(entry.courseId).push(entry);
    return map;
  }, new Map());

  let gradedScores = [];
  const statusBreakdown = {
    submitted: 0,
    graded: 0,
    pending: 0,
  };

  const enrollmentReports = enrollments.map((enrollment) => {
    const courseAssignments = assignmentsByCourseId.get(enrollment.courseId) || [];
    const courseGrades = courseAssignments.map((assignment) => {
      const submission = submissionsByAssignmentId.get(assignment.id);
      if (!submission) {
        statusBreakdown.pending += 1;
        return {
          assignmentId: assignment.id,
          title: assignment.title,
          maxScore: assignment.maxScore,
          status: 'not_submitted',
          score: null,
          feedback: null,
          submittedAt: null,
        };
      }

      if (submission.status === 'graded') {
        statusBreakdown.graded += 1;
        if (assignment.maxScore) {
          gradedScores.push((Number(submission.score || 0) / Number(assignment.maxScore)) * 100);
        }
      } else {
        statusBreakdown.submitted += 1;
      }

      return {
        assignmentId: assignment.id,
        title: assignment.title,
        maxScore: assignment.maxScore,
        status: submission.status,
        score: submission.score,
        feedback: submission.feedback,
        submittedAt: submission.submittedAt,
      };
    });

    const courseAttempts = attemptsByCourseId.get(enrollment.courseId) || [];
    return {
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        category: enrollment.course.category,
        isPublished: enrollment.course.isPublished,
        teacher: enrollment.course.teacher
          ? {
              id: enrollment.course.teacher.id,
              name: getFullName(enrollment.course.teacher),
              email: enrollment.course.teacher.email,
            }
          : null,
      },
      enrolledAt: enrollment.enrolledAt,
      completionPercentage: round(enrollment.completionPercentage),
      completedLessons: (progressByCourseId.get(enrollment.courseId) || []).length,
      grades: courseGrades,
      quizzes: courseAttempts.map((attempt) => ({
        id: attempt.id,
        title: attempt.quiz?.title || 'Quiz',
        score: attempt.score,
        completedAt: attempt.completedAt,
      })),
    };
  });

  const overallAverage = gradedScores.length
    ? round(gradedScores.reduce((total, value) => total + value, 0) / gradedScores.length)
    : 0;

  return {
    student: serializeUser(student),
    enrollments: enrollmentReports,
    quizAttempts: quizAttempts.map((attempt) => ({
      id: attempt.id,
      title: attempt.quiz?.title || 'Quiz',
      course: attempt.quiz?.course
        ? {
            id: attempt.quiz.course.id,
            title: attempt.quiz.course.title,
            category: attempt.quiz.course.category,
          }
        : null,
      score: attempt.score,
      completedAt: attempt.completedAt,
    })),
    assignmentStatusBreakdown: statusBreakdown,
    overallAverage,
  };
};

const buildCourseReportData = async (courseId) => {
  const course = await Course.findByPk(courseId, {
    include: [
      {
        model: User,
        as: 'teacher',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!course) {
    return null;
  }

  const [gradebook, analytics, quizAttempts] = await Promise.all([
    buildCourseGradebook(courseId),
    buildCourseAnalytics(courseId),
    QuizAttempt.findAll({
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title', 'courseId'],
          where: { courseId },
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['completedAt', 'DESC']],
    }),
  ]);

  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      isPublished: course.isPublished,
      teacher: course.teacher
        ? {
            id: course.teacher.id,
            name: getFullName(course.teacher),
            email: course.teacher.email,
          }
        : null,
    },
    analytics,
    assignments: gradebook.assignments,
    students: gradebook.students,
    classAverage: gradebook.classAverage,
    quizAttempts: quizAttempts.map((attempt) => ({
      id: attempt.id,
      score: attempt.score,
      completedAt: attempt.completedAt,
      quiz: attempt.quiz
        ? {
            id: attempt.quiz.id,
            title: attempt.quiz.title,
          }
        : null,
      student: attempt.student
        ? {
            id: attempt.student.id,
            name: getFullName(attempt.student),
            email: attempt.student.email,
          }
        : null,
    })),
  };
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

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
      return error(res, 'You cannot delete your own account', 400);
    }

    if (req.body.confirm !== true) {
      return error(res, 'Confirmation is required to delete this user', 400);
    }

    const teacherCourses = await Course.findAll({
      where: { teacherId: user.id },
      attributes: ['id', 'thumbnail'],
    });
    const courseIds = teacherCourses.map((course) => course.id);

    const assignmentWhere = {
      [Op.or]: [{ teacherId: user.id }, ...(courseIds.length ? [{ courseId: { [Op.in]: courseIds } }] : [])],
    };
    const assignments = await Assignment.findAll({
      where: assignmentWhere,
      attributes: ['id'],
    });
    const assignmentIds = assignments.map((assignment) => assignment.id);

    const materialFiles = courseIds.length
      ? await Material.findAll({
          where: { courseId: { [Op.in]: courseIds } },
          attributes: ['filePath'],
        })
      : [];

    const submissionWhere = {
      [Op.or]: [{ studentId: user.id }, ...(assignmentIds.length ? [{ assignmentId: { [Op.in]: assignmentIds } }] : [])],
    };
    const submissionFiles = await Submission.findAll({
      where: submissionWhere,
      attributes: ['filePath'],
    });

    await User.sequelize.transaction(async (transaction) => {
      await Notification.destroy({ where: { userId: user.id }, transaction });
      await LessonProgress.destroy({ where: { studentId: user.id }, transaction });
      await QuizAttempt.destroy({ where: { studentId: user.id }, transaction });
      await Enrollment.destroy({ where: { studentId: user.id }, transaction });
      await Submission.destroy({ where: submissionWhere, transaction });

      if (assignmentIds.length) {
        await Assignment.destroy({
          where: { id: { [Op.in]: assignmentIds } },
          transaction,
        });
      }

      if (courseIds.length) {
        await Course.destroy({
          where: { id: { [Op.in]: courseIds } },
          transaction,
        });
      }

      await user.destroy({ transaction });
    });

    removeFiles([
      ...teacherCourses.map((course) => course.thumbnail),
      ...materialFiles.map((material) => material.filePath),
      ...submissionFiles.map((submission) => submission.filePath),
    ]);

    return success(res, null, 'User deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalStudents, totalTeachers, totalAdmins, totalCourses, totalEnrollments] = await Promise.all([
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

const getAdminCourses = async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const whereClause = {
      ...(status === 'published' ? { isPublished: true } : {}),
      ...(status === 'draft' ? { isPublished: false } : {}),
      ...(category ? { category } : {}),
      ...(teacherId ? { teacherId } : {}),
    };

    const titleSearch = buildCourseSearchWhere(search);
    if (titleSearch) {
      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push(titleSearch);
    }

    const courses = await Course.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['title', 'ASC']],
    });

    const courseIds = courses.map((course) => course.id);
    const [enrollments, assignments, quizzes] = await Promise.all([
      courseIds.length ? Enrollment.findAll({ where: { courseId: { [Op.in]: courseIds } } }) : [],
      courseIds.length ? Assignment.findAll({ where: { courseId: { [Op.in]: courseIds } } }) : [],
      courseIds.length ? Quiz.findAll({ where: { courseId: { [Op.in]: courseIds } } }) : [],
    ]);

    const enrollmentsByCourseId = enrollments.reduce((map, enrollment) => {
      if (!map.has(enrollment.courseId)) {
        map.set(enrollment.courseId, []);
      }
      map.get(enrollment.courseId).push(enrollment);
      return map;
    }, new Map());

    const assignmentCountByCourseId = assignments.reduce((map, assignment) => {
      map.set(assignment.courseId, (map.get(assignment.courseId) || 0) + 1);
      return map;
    }, new Map());

    const quizCountByCourseId = quizzes.reduce((map, quiz) => {
      map.set(quiz.courseId, (map.get(quiz.courseId) || 0) + 1);
      return map;
    }, new Map());

    const payload = courses.map((course) => {
      const courseEnrollments = enrollmentsByCourseId.get(course.id) || [];
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        isPublished: course.isPublished,
        teacher: course.teacher
          ? {
              id: course.teacher.id,
              firstName: course.teacher.firstName,
              lastName: course.teacher.lastName,
              name: getFullName(course.teacher),
              email: course.teacher.email,
            }
          : null,
        thumbnailUrl: getUploadUrl(course.thumbnail),
        enrollmentCount: courseEnrollments.length,
        completionRate: courseEnrollments.length
          ? round(
              courseEnrollments.reduce(
                (total, enrollment) => total + Number(enrollment.completionPercentage || 0),
                0
              ) / courseEnrollments.length
            )
          : 0,
        assignmentCount: assignmentCountByCourseId.get(course.id) || 0,
        quizCount: quizCountByCourseId.get(course.id) || 0,
        status: course.isPublished ? 'Published' : 'Draft',
      };
    });

    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'firstName', 'lastName'],
      order: [['firstName', 'ASC']],
    });

    const categories = [...new Set((await Course.findAll({ attributes: ['category'] })).map((course) => course.category).filter(Boolean))].sort();

    return success(res, {
      courses: payload,
      filters: {
        categories,
        teachers: teachers.map((teacher) => ({
          id: teacher.id,
          name: getFullName(teacher),
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
};

const updateCourseStatus = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    course.isPublished = Boolean(req.body.isPublished);
    await course.save();

    return success(res, {
      course: {
        id: course.id,
        title: course.title,
        isPublished: course.isPublished,
        status: course.isPublished ? 'Published' : 'Draft',
        teacher: course.teacher
          ? {
              id: course.teacher.id,
              name: getFullName(course.teacher),
              email: course.teacher.email,
            }
          : null,
      },
    }, 'Course status updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteCourseAdmin = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    if (req.body.confirm !== true) {
      return error(res, 'Confirmation is required to delete this course', 400);
    }

    if (course.thumbnail && fs.existsSync(course.thumbnail)) {
      fs.unlinkSync(course.thumbnail);
    }

    await course.destroy();
    return success(res, null, 'Course deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const getReportsOverview = async (req, res, next) => {
  try {
    const [users, courses, enrollments, assignments, submissions, quizAttempts] = await Promise.all([
      User.findAll({ attributes: ['id', 'role', 'firstName', 'lastName', 'createdAt'] }),
      Course.findAll({
        include: [
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      }),
      Enrollment.findAll({ attributes: ['id', 'studentId', 'courseId', 'enrolledAt', 'completionPercentage'] }),
      Assignment.findAll({ attributes: ['id', 'courseId', 'maxScore'] }),
      Submission.findAll({
        attributes: ['id', 'studentId', 'assignmentId', 'status', 'score', 'submittedAt'],
      }),
      QuizAttempt.findAll({
        attributes: ['id', 'studentId', 'quizId', 'score', 'completedAt'],
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['id', 'courseId'],
          },
        ],
      }),
    ]);

    const students = users.filter((user) => user.role === 'student');
    const teachers = users.filter((user) => user.role === 'teacher');
    const publishedCourses = courses.filter((course) => course.isPublished).length;
    const gradedSubmissions = submissions.filter((submission) => submission.status === 'graded');
    const pendingGrading = submissions.filter((submission) => submission.status === 'submitted').length;
    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));

    const scoreSamples = [
      ...gradedSubmissions.map((submission) => {
        const assignment = assignmentById.get(submission.assignmentId);
        if (!assignment?.maxScore) {
          return 0;
        }
        return (Number(submission.score || 0) / Number(assignment.maxScore)) * 100;
      }),
      ...quizAttempts.map((attempt) => Number(attempt.score || 0)),
    ].filter((score) => Number.isFinite(score));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = new Set([
      ...enrollments.filter((entry) => new Date(entry.enrolledAt) >= sevenDaysAgo).map((entry) => entry.studentId),
      ...submissions.filter((entry) => new Date(entry.submittedAt) >= sevenDaysAgo).map((entry) => entry.studentId),
      ...quizAttempts
        .filter((entry) => entry.completedAt && new Date(entry.completedAt) >= sevenDaysAgo)
        .map((entry) => entry.studentId),
    ]);

    const enrollmentByCourse = courses.map((course) => ({
      courseId: course.id,
      title: course.title,
      enrollmentCount: enrollments.filter((enrollment) => enrollment.courseId === course.id).length,
    }));

    const scoreDistributionMap = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scoreSamples.forEach((score) => {
      scoreDistributionMap[buildScoreBucket(score)] += 1;
    });

    const scoreDistribution = Object.entries(scoreDistributionMap).map(([grade, count]) => ({
      grade,
      count,
    }));

    const userGrowthMap = new Map();
    for (let index = 0; index < 8; index += 1) {
      const date = getWeekStart(new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000));
      userGrowthMap.set(date.toISOString().slice(0, 10), {
        week: date.toISOString().slice(0, 10),
        students: 0,
        teachers: 0,
      });
    }

    users.forEach((user) => {
      const week = getWeekStart(user.createdAt).toISOString().slice(0, 10);
      if (!userGrowthMap.has(week)) {
        return;
      }

      if (user.role === 'student') {
        userGrowthMap.get(week).students += 1;
      }

      if (user.role === 'teacher') {
        userGrowthMap.get(week).teachers += 1;
      }
    });

    const submissionsByStudentId = gradedSubmissions.reduce((map, submission) => {
      if (!map.has(submission.studentId)) {
        map.set(submission.studentId, []);
      }
      map.get(submission.studentId).push(submission);
      return map;
    }, new Map());

    const attemptsByStudentId = quizAttempts.reduce((map, attempt) => {
      if (!map.has(attempt.studentId)) {
        map.set(attempt.studentId, []);
      }
      map.get(attempt.studentId).push(attempt);
      return map;
    }, new Map());

    const enrollmentsByStudentId = enrollments.reduce((map, enrollment) => {
      map.set(enrollment.studentId, (map.get(enrollment.studentId) || 0) + 1);
      return map;
    }, new Map());

    const topStudents = students
      .map((student) => {
        const studentSubmissions = submissionsByStudentId.get(student.id) || [];
        const studentAttempts = attemptsByStudentId.get(student.id) || [];
        const assignmentAverage = studentSubmissions.length
          ? round(
              studentSubmissions.reduce((total, submission) => {
                const assignment = assignmentById.get(submission.assignmentId);
                if (!assignment?.maxScore) {
                  return total;
                }
                return total + (Number(submission.score || 0) / Number(assignment.maxScore)) * 100;
              }, 0) / studentSubmissions.length
            )
          : 0;

        const combinedScores = [
          ...studentSubmissions.map((submission) => {
            const assignment = assignmentById.get(submission.assignmentId);
            return assignment?.maxScore ? (Number(submission.score || 0) / Number(assignment.maxScore)) * 100 : 0;
          }),
          ...studentAttempts.map((attempt) => Number(attempt.score || 0)),
        ];

        return {
          id: student.id,
          name: getFullName(student),
          enrolledCourses: enrollmentsByStudentId.get(student.id) || 0,
          avgGrade: assignmentAverage,
          quizzesTaken: studentAttempts.length,
          overallPercentage: combinedScores.length
            ? round(combinedScores.reduce((total, score) => total + score, 0) / combinedScores.length)
            : 0,
        };
      })
      .sort((first, second) => second.overallPercentage - first.overallPercentage)
      .slice(0, 10);

    const coursesNeedingAttention = courses
      .map((course) => {
        const courseEnrollments = enrollments.filter((enrollment) => enrollment.courseId === course.id);
        const courseAssignments = assignments.filter((assignment) => assignment.courseId === course.id);
        const courseAssignmentIds = new Set(courseAssignments.map((assignment) => assignment.id));
        const courseSubmissions = submissions.filter((submission) => courseAssignmentIds.has(submission.assignmentId));
        const courseAttempts = quizAttempts.filter((attempt) => attempt.quiz?.courseId === course.id);
        const avgCompletion = courseEnrollments.length
          ? round(
              courseEnrollments.reduce(
                (total, enrollment) => total + Number(enrollment.completionPercentage || 0),
                0
              ) / courseEnrollments.length
            )
          : 0;

        const reasons = [];
        const pendingCount = courseSubmissions.filter((submission) => submission.status === 'submitted').length;
        if (pendingCount > 10) {
          reasons.push(`${pendingCount} submissions awaiting grading`);
        }
        if (avgCompletion < 30) {
          reasons.push(`Average completion is ${avgCompletion}%`);
        }
        if (courseAttempts.length === 0) {
          reasons.push('No quiz attempts recorded');
        }

        return reasons.length
          ? {
              courseId: course.id,
              title: course.title,
              teacherName: course.teacher ? getFullName(course.teacher) : 'Unknown teacher',
              reasons,
            }
          : null;
      })
      .filter(Boolean);

    return success(res, {
      totalUsers: users.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalCourses: courses.length,
      publishedCourses,
      totalEnrollments: enrollments.length,
      totalSubmissions: submissions.length,
      gradedSubmissions: gradedSubmissions.length,
      pendingGrading,
      totalQuizAttempts: quizAttempts.length,
      avgPlatformScore: scoreSamples.length
        ? round(scoreSamples.reduce((total, score) => total + score, 0) / scoreSamples.length)
        : 0,
      activeThisWeek: activeUsers.size,
      newUsersThisMonth: users.filter((user) => new Date(user.createdAt) >= oneMonthAgo).length,
      enrollmentByCourse,
      scoreDistribution,
      userGrowth: [...userGrowthMap.values()].sort((first, second) => first.week.localeCompare(second.week)),
      topStudents,
      coursesNeedingAttention,
    });
  } catch (err) {
    return next(err);
  }
};

const getCourseReport = async (req, res, next) => {
  try {
    const report = await buildCourseReportData(req.params.id);
    if (!report) {
      return error(res, 'Course not found', 404);
    }

    return success(res, report);
  } catch (err) {
    return next(err);
  }
};

const getStudentReport = async (req, res, next) => {
  try {
    const report = await buildStudentReportData(req.params.id);
    if (!report) {
      return error(res, 'Student not found', 404);
    }

    return success(res, report);
  } catch (err) {
    return next(err);
  }
};

const getActivityReport = async (req, res, next) => {
  try {
    const events = await buildRecentActivity(50);
    return success(res, { events });
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
  getAdminCourses,
  updateCourseStatus,
  deleteCourseAdmin,
  getReportsOverview,
  getCourseReport,
  getStudentReport,
  getActivityReport,
};

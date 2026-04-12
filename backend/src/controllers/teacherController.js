const { Op } = require('sequelize');
const {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  Quiz,
  QuizAttempt,
  Submission,
  User,
} = require('../models');
const { error, success } = require('../utils/responseHelper');
const { ensureCourseOwnership } = require('../utils/courseHelpers');
const { getUploadUrl } = require('../utils/courseHelpers');

const round = (value) => Number(Number(value || 0).toFixed(2));
const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
const getDayDiff = (date) =>
  Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));

const buildCourseGradebook = async (courseId) => {
  const course = await Course.findByPk(courseId, {
    attributes: ['id', 'title', 'category', 'teacherId'],
  });

  const [assignments, enrollments, submissions] = await Promise.all([
    Assignment.findAll({
      where: { courseId },
      attributes: ['id', 'title', 'description', 'maxScore', 'dueDate'],
      order: [
        ['dueDate', 'ASC'],
        ['title', 'ASC'],
      ],
    }),
    Enrollment.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [[{ model: User, as: 'student' }, 'firstName', 'ASC']],
    }),
    Submission.findAll({
      include: [
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'courseId', 'maxScore'],
          where: { courseId },
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['submittedAt', 'DESC']],
    }),
  ]);

  const submissionsByStudentAndAssignment = new Map();
  const gradedPercentages = [];

  submissions.forEach((submission) => {
    submissionsByStudentAndAssignment.set(`${submission.studentId}:${submission.assignmentId}`, submission);

    if (submission.status === 'graded' && submission.assignment?.maxScore) {
      gradedPercentages.push((Number(submission.score || 0) / Number(submission.assignment.maxScore)) * 100);
    }
  });

  const students = enrollments.map((enrollment) => {
    const grades = {};
    const gradedValues = [];

    assignments.forEach((assignment) => {
      const submission = submissionsByStudentAndAssignment.get(`${enrollment.studentId}:${assignment.id}`);

      if (!submission) {
        grades[assignment.id] = { score: null, status: 'not_submitted' };
        return;
      }

      grades[assignment.id] = {
        score: submission.status === 'graded' ? Number(submission.score) : null,
        status: submission.status,
        submissionId: submission.id,
        feedback: submission.feedback,
        submittedAt: submission.submittedAt,
        content: submission.content,
        filePath: submission.filePath,
        fileUrl: getUploadUrl(submission.filePath),
      };

      if (submission.status === 'graded' && assignment.maxScore) {
        gradedValues.push((Number(submission.score || 0) / Number(assignment.maxScore)) * 100);
      }
    });

    return {
      id: enrollment.student.id,
      name: getFullName(enrollment.student),
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      email: enrollment.student.email,
      completionPercentage: round(enrollment.completionPercentage),
      grades,
      average: gradedValues.length
        ? round(gradedValues.reduce((total, value) => total + value, 0) / gradedValues.length)
        : null,
    };
  });

  return {
    course,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      maxScore: assignment.maxScore,
      dueDate: assignment.dueDate,
    })),
    students,
    classAverage: gradedPercentages.length
      ? round(gradedPercentages.reduce((total, value) => total + value, 0) / gradedPercentages.length)
      : 0,
  };
};

const buildCourseAnalytics = async (courseId) => {
  const [enrollments, assignments, quizzes, attempts, lessons] = await Promise.all([
    Enrollment.findAll({
      where: { courseId },
      attributes: ['id', 'studentId', 'completionPercentage'],
    }),
    Assignment.findAll({
      where: { courseId },
      attributes: ['id', 'title', 'maxScore'],
      include: [
        {
          model: Submission,
          as: 'submissions',
          attributes: ['id', 'studentId', 'status', 'score'],
          required: false,
        },
      ],
      order: [['dueDate', 'ASC']],
    }),
    Quiz.findAll({
      where: { courseId },
      attributes: ['id', 'title'],
      order: [['title', 'ASC']],
    }),
    QuizAttempt.findAll({
      include: [
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'courseId', 'title'],
          where: { courseId },
        },
      ],
      order: [['completedAt', 'DESC']],
    }),
    Lesson.count({ where: { courseId } }),
  ]);

  const assignmentStats = assignments.map((assignment) => {
    const submitted = assignment.submissions || [];
    const graded = submitted.filter((submission) => submission.status === 'graded');
    const averageScore = graded.length
      ? round(
          graded.reduce((total, submission) => {
            if (!assignment.maxScore) {
              return total;
            }
            return total + (Number(submission.score || 0) / Number(assignment.maxScore)) * 100;
          }, 0) / graded.length
        )
      : 0;

    return {
      title: assignment.title,
      submittedCount: submitted.length,
      gradedCount: graded.length,
      avgScore: averageScore,
    };
  });

  const quizStats = {
    attemptCount: attempts.length,
    avgScore: attempts.length
      ? round(attempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) / attempts.length)
      : 0,
  };

  return {
    enrollmentCount: enrollments.length,
    lessonCount: lessons,
    avgCompletionPercentage: enrollments.length
      ? round(
          enrollments.reduce((total, enrollment) => total + Number(enrollment.completionPercentage || 0), 0) /
            enrollments.length
        )
      : 0,
    assignmentStats,
    quizStats,
    progressDistribution: {
      completed: enrollments.filter((enrollment) => Number(enrollment.completionPercentage || 0) >= 100).length,
      inProgress: enrollments.filter((enrollment) => {
        const progress = Number(enrollment.completionPercentage || 0);
        return progress > 0 && progress < 100;
      }).length,
      notStarted: enrollments.filter((enrollment) => Number(enrollment.completionPercentage || 0) <= 0).length,
    },
  };
};

const getPendingGrading = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'oldest';

    if (courseId) {
      const ownership = await ensureCourseOwnership(courseId, req.user);
      if (ownership.error) {
        return error(res, ownership.error.message, ownership.error.statusCode);
      }
    }

    const submissions = await Submission.findAll({
      where: { status: 'submitted' },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Assignment,
          as: 'assignment',
          required: true,
          attributes: ['id', 'title', 'description', 'maxScore', 'dueDate', 'courseId'],
          include: [
            {
              model: Course,
              as: 'course',
              required: true,
              attributes: ['id', 'title', 'teacherId'],
              where: {
                teacherId: req.user.id,
                ...(courseId ? { id: courseId } : {}),
              },
            },
          ],
        },
      ],
    });

    const responseSubmissions = submissions.map((submission) => ({
      id: submission.id,
      student: {
        id: submission.student.id,
        firstName: submission.student.firstName,
        lastName: submission.student.lastName,
        email: submission.student.email,
      },
      assignment: {
        id: submission.assignment.id,
        title: submission.assignment.title,
        description: submission.assignment.description,
        maxScore: submission.assignment.maxScore,
        dueDate: submission.assignment.dueDate,
      },
      course: {
        id: submission.assignment.course.id,
        title: submission.assignment.course.title,
      },
      submittedAt: submission.submittedAt,
      content: submission.content,
      filePath: submission.filePath,
      fileUrl: getUploadUrl(submission.filePath),
      daysWaiting: getDayDiff(submission.submittedAt),
    }));

    responseSubmissions.sort((first, second) => {
      if (sort === 'newest') {
        return new Date(second.submittedAt) - new Date(first.submittedAt);
      }
      if (sort === 'course') {
        return (
          first.course.title.localeCompare(second.course.title) ||
          new Date(first.submittedAt) - new Date(second.submittedAt)
        );
      }
      return new Date(first.submittedAt) - new Date(second.submittedAt);
    });

    return success(res, {
      total: responseSubmissions.length,
      submissions: responseSubmissions,
    });
  } catch (err) {
    return next(err);
  }
};

const getGradebook = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const gradebook = await buildCourseGradebook(req.params.courseId);
    return success(res, gradebook);
  } catch (err) {
    return next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const analytics = await buildCourseAnalytics(req.params.courseId);
    return success(res, analytics);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  buildCourseGradebook,
  buildCourseAnalytics,
  getPendingGrading,
  getGradebook,
  getAnalytics,
};

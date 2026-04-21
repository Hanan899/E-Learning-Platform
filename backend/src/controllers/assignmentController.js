const fs = require('fs');
const {
  Assignment,
  Course,
  Enrollment,
  Submission,
  User,
} = require('../models');
const { error, success } = require('../utils/responseHelper');
const { ensureCourseOwnership } = require('../utils/courseHelpers');
const {
  ensureAssignmentAccess,
  ensureAssignmentOwnership,
  ensureSubmissionOwnership,
  serializeAssignment,
  serializeSubmission,
} = require('../utils/assignmentHelpers');
const { createNotification, createNotifications } = require('../utils/notificationService');

const toIsoDate = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};
const hasDeadlinePassed = (dueDate) => new Date(dueDate).getTime() < Date.now();
const sanitizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const createAssignment = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const dueDate = toIsoDate(req.body.dueDate);
    if (!dueDate) {
      return error(res, 'A valid due date is required', 400);
    }

    if (hasDeadlinePassed(dueDate)) {
      return error(res, 'Due date must be in the future', 400);
    }

    const assignment = await Assignment.create({
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      dueDate,
      maxScore: Number(req.body.maxScore),
      courseId: req.params.courseId,
      teacherId: req.user.id,
    });

    const enrollments = await Enrollment.findAll({
      where: { courseId: req.params.courseId },
      attributes: ['studentId'],
    });

    if (enrollments.length > 0) {
      await createNotifications(
        enrollments.map((enrollment) => enrollment.studentId),
        {
          title: 'New assignment posted',
          message: `New assignment: ${assignment.title} due ${new Date(dueDate).toLocaleDateString('en-US')}`,
          type: 'deadline',
        }
      );
    }

    return success(
      res,
      {
        assignment: {
          ...serializeAssignment(assignment),
          submissionCount: 0,
          gradedCount: 0,
          enrolledCount: enrollments.length,
        },
      },
      'Assignment created successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    if (req.user.role === 'teacher' && course.teacherId !== req.user.id) {
      return error(res, 'You do not have access to this course', 403);
    }

    let enrollment = null;
    if (req.user.role === 'student') {
      if (!course.isPublished) {
        return error(res, 'This course is currently unavailable to students', 403);
      }

      enrollment = await Enrollment.findOne({
        where: { studentId: req.user.id, courseId: course.id },
      });

      if (!enrollment) {
        return error(res, 'You must be enrolled in this course first', 403);
      }
    }

    const assignments = await Assignment.findAll({
      where: { courseId: course.id },
      include: [
        {
          model: Submission,
          as: 'submissions',
          include:
            req.user.role === 'teacher'
              ? [
                  {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                  },
                ]
              : [],
          ...(req.user.role === 'student'
            ? {
                where: { studentId: req.user.id },
                required: false,
              }
            : {}),
        },
      ],
      order: [['dueDate', 'ASC']],
    });

    const enrolledCount = await Enrollment.count({ where: { courseId: course.id } });

    return success(res, {
      assignments: assignments.map((assignment) => {
        const submissions = assignment.submissions || [];
        const gradedCount = submissions.filter((submission) => submission.status === 'graded').length;

        return {
          ...serializeAssignment(assignment),
          submissionCount: req.user.role === 'teacher' ? submissions.length : Number(Boolean(submissions[0])),
          gradedCount,
          enrolledCount,
          mySubmission: req.user.role === 'student' ? serializeSubmission(submissions[0]) : null,
        };
      }),
      course: {
        id: course.id,
        title: course.title,
      },
      ...(enrollment
        ? {
            enrollment: {
              id: enrollment.id,
              completionPercentage: enrollment.completionPercentage,
            },
          }
        : {}),
    });
  } catch (err) {
    return next(err);
  }
};

const getAssignment = async (req, res, next) => {
  try {
    const access = await ensureAssignmentAccess(req.params.id, req.user);
    if (access.error) {
      return error(res, access.error.message, access.error.statusCode);
    }

    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'category'],
        },
        {
          model: Submission,
          as: 'submissions',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
          ...(req.user.role === 'student'
            ? {
                where: { studentId: req.user.id },
                required: false,
              }
            : {}),
        },
      ],
      order: [[{ model: Submission, as: 'submissions' }, 'submittedAt', 'DESC']],
    });

    const submissions = assignment.submissions || [];
    const gradedSubmissions = submissions.filter((submission) => submission.status === 'graded');
    const averageScore = gradedSubmissions.length
      ? Number(
          (
            gradedSubmissions.reduce((total, submission) => total + Number(submission.score || 0), 0) /
            gradedSubmissions.length
          ).toFixed(2)
        )
      : 0;

    return success(res, {
      assignment: {
        ...serializeAssignment(assignment),
        submissions: req.user.role === 'teacher' ? submissions.map(serializeSubmission) : undefined,
        mySubmission: req.user.role === 'student' ? serializeSubmission(submissions[0]) : undefined,
      },
      stats: {
        totalSubmitted: submissions.length,
        totalGraded: gradedSubmissions.length,
        averageScore,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const ownership = await ensureAssignmentOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const updates = {};
    if (typeof req.body.title === 'string') {
      updates.title = req.body.title.trim();
    }
    if (typeof req.body.description === 'string') {
      updates.description = req.body.description.trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'maxScore')) {
      updates.maxScore = Number(req.body.maxScore);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'dueDate')) {
      const dueDate = toIsoDate(req.body.dueDate);
      if (!dueDate) {
        return error(res, 'A valid due date is required', 400);
      }
      if (hasDeadlinePassed(dueDate)) {
        return error(res, 'Due date must be in the future', 400);
      }
      updates.dueDate = dueDate;
    }

    await ownership.assignment.update(updates);

    return success(res, {
      assignment: serializeAssignment(ownership.assignment),
    }, 'Assignment updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    const ownership = await ensureAssignmentOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const submissions = await Submission.findAll({
      where: { assignmentId: ownership.assignment.id },
      attributes: ['filePath'],
    });

    submissions.forEach((submission) => {
      if (submission.filePath && fs.existsSync(submission.filePath)) {
        fs.unlinkSync(submission.filePath);
      }
    });

    await ownership.assignment.destroy();

    return success(res, null, 'Assignment deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const submitAssignment = async (req, res, next) => {
  try {
    const access = await ensureAssignmentAccess(req.params.id, req.user);
    if (access.error) {
      return error(res, access.error.message, access.error.statusCode);
    }

    if (req.user.role !== 'student') {
      return error(res, 'Only students can submit assignments', 403);
    }

    const existingSubmission = await Submission.findOne({
      where: { assignmentId: access.assignment.id, studentId: req.user.id },
    });

    if (existingSubmission) {
      return error(res, 'Assignment already submitted', 400);
    }

    if (hasDeadlinePassed(access.assignment.dueDate)) {
      return error(res, 'Deadline passed', 400);
    }

    const content = sanitizeText(req.body.content);
    if (!content && !req.file) {
      return error(res, 'A written response or file upload is required', 400);
    }

    const submission = await Submission.create({
      content,
      filePath: req.file?.path || null,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      assignmentId: access.assignment.id,
      studentId: req.user.id,
    });

    return success(
      res,
      { submission: serializeSubmission(submission) },
      'Assignment submitted successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const gradeSubmission = async (req, res, next) => {
  try {
    const ownership = await ensureSubmissionOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const score = Number(req.body.score);
    if (score > ownership.assignment.maxScore) {
      return error(res, 'Score cannot exceed the maximum score', 400);
    }

    await ownership.submission.update({
      score,
      feedback: sanitizeText(req.body.feedback),
      status: 'graded',
    });

    const teacherName = `${req.user.firstName} ${req.user.lastName}`.trim();
    await createNotification(ownership.submission.studentId, {
      title: 'Assignment graded',
      message: `${teacherName} has graded your assignment '${ownership.assignment.title}': ${score}/${ownership.assignment.maxScore}. Assignment graded: ${score}/${ownership.assignment.maxScore}`,
      type: 'grade',
    });

    return success(res, {
      submission: serializeSubmission(ownership.submission),
    }, 'Submission graded successfully');
  } catch (err) {
    return next(err);
  }
};

const getAllSubmissions = async (req, res, next) => {
  try {
    const ownership = await ensureAssignmentOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const whereClause = {
      assignmentId: ownership.assignment.id,
      ...(req.query.status ? { status: req.query.status } : {}),
    };

    const submissions = await Submission.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['submittedAt', 'DESC']],
    });

    return success(res, {
      assignment: serializeAssignment(ownership.assignment),
      submissions: submissions.map(serializeSubmission),
    });
  } catch (err) {
    return next(err);
  }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Assignment,
          as: 'assignment',
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
    });

    return success(res, {
      submissions: submissions.map((submission) => ({
        ...serializeSubmission(submission),
        assignment: submission.assignment ? serializeAssignment(submission.assignment) : null,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
  getAllSubmissions,
  getMySubmissions,
};

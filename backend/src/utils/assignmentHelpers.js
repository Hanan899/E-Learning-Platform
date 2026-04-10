const { Assignment, Course, Enrollment, Submission, User } = require('../models');
const { getUploadUrl } = require('./courseHelpers');

const serializeAssignment = (assignment) => ({
  id: assignment.id,
  title: assignment.title,
  description: assignment.description,
  dueDate: assignment.dueDate,
  maxScore: assignment.maxScore,
  courseId: assignment.courseId,
  teacherId: assignment.teacherId,
  course: assignment.course
    ? {
        id: assignment.course.id,
        title: assignment.course.title,
        category: assignment.course.category,
      }
    : null,
});

const serializeSubmission = (submission) => {
  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    content: submission.content,
    filePath: submission.filePath,
    fileUrl: getUploadUrl(submission.filePath),
    score: submission.score,
    feedback: submission.feedback,
    status: submission.status,
    submittedAt: submission.submittedAt,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    student: submission.student
      ? {
          id: submission.student.id,
          firstName: submission.student.firstName,
          lastName: submission.student.lastName,
          email: submission.student.email,
        }
      : null,
  };
};

const ensureAssignmentOwnership = async (assignmentId, user) => {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!assignment) {
    return { error: { statusCode: 404, message: 'Assignment not found' } };
  }

  if (user.role !== 'teacher' || assignment.course.teacherId !== user.id) {
    return { error: { statusCode: 403, message: 'You do not have access to this assignment' } };
  }

  return { assignment, course: assignment.course };
};

const ensureAssignmentAccess = async (assignmentId, user) => {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!assignment) {
    return { error: { statusCode: 404, message: 'Assignment not found' } };
  }

  if (user.role === 'teacher') {
    if (assignment.course.teacherId !== user.id) {
      return { error: { statusCode: 403, message: 'You do not have access to this assignment' } };
    }

    return { assignment, course: assignment.course };
  }

  if (user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      where: {
        studentId: user.id,
        courseId: assignment.courseId,
      },
    });

    if (!enrollment) {
      return { error: { statusCode: 403, message: 'You must be enrolled in this course first' } };
    }

    return { assignment, course: assignment.course, enrollment };
  }

  return { error: { statusCode: 403, message: 'You do not have access to this assignment' } };
};

const ensureSubmissionOwnership = async (submissionId, user) => {
  const submission = await Submission.findByPk(submissionId, {
    include: [
      {
        model: Assignment,
        as: 'assignment',
        include: [{ model: Course, as: 'course' }],
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!submission) {
    return { error: { statusCode: 404, message: 'Submission not found' } };
  }

  if (user.role !== 'teacher' || submission.assignment.course.teacherId !== user.id) {
    return { error: { statusCode: 403, message: 'You do not have access to this submission' } };
  }

  return {
    submission,
    assignment: submission.assignment,
    course: submission.assignment.course,
  };
};

module.exports = {
  ensureAssignmentOwnership,
  ensureAssignmentAccess,
  ensureSubmissionOwnership,
  serializeAssignment,
  serializeSubmission,
};

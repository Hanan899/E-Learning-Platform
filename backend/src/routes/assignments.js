const express = require('express');
const { body, param, query } = require('express-validator');
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate);

router.post(
  '/courses/:courseId/assignments',
  authorize('teacher'),
  [
    param('courseId').isUUID().withMessage('Course id must be a valid UUID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('dueDate').notEmpty().withMessage('Due date is required').isISO8601().withMessage('Due date must be valid'),
    body('maxScore').isInt({ min: 1, max: 1000 }).withMessage('Max score must be between 1 and 1000'),
    validateRequest,
  ],
  assignmentController.createAssignment
);

router.get(
  '/courses/:courseId/assignments',
  [
    param('courseId').isUUID().withMessage('Course id must be a valid UUID'),
    validateRequest,
  ],
  assignmentController.getAssignments
);

router.get(
  '/assignments/:id',
  [param('id').isUUID().withMessage('Assignment id must be a valid UUID'), validateRequest],
  assignmentController.getAssignment
);

router.put(
  '/assignments/:id',
  authorize('teacher'),
  [
    param('id').isUUID().withMessage('Assignment id must be a valid UUID'),
    body('title').optional({ values: 'falsy' }).isString(),
    body('description').optional({ values: 'falsy' }).isString(),
    body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Due date must be valid'),
    body('maxScore').optional().isInt({ min: 1, max: 1000 }).withMessage('Max score must be between 1 and 1000'),
    validateRequest,
  ],
  assignmentController.updateAssignment
);

router.delete(
  '/assignments/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Assignment id must be a valid UUID'), validateRequest],
  assignmentController.deleteAssignment
);

router.post(
  '/assignments/:id/submit',
  authorize('student'),
  uploadSingle('file'),
  [
    param('id').isUUID().withMessage('Assignment id must be a valid UUID'),
    body('content').optional({ values: 'falsy' }).isString(),
    validateRequest,
  ],
  assignmentController.submitAssignment
);

router.put(
  '/submissions/:id/grade',
  authorize('teacher'),
  [
    param('id').isUUID().withMessage('Submission id must be a valid UUID'),
    body('score').isFloat({ min: 0 }).withMessage('Score must be zero or higher'),
    body('feedback').optional({ values: 'falsy' }).isString(),
    validateRequest,
  ],
  assignmentController.gradeSubmission
);

router.get(
  '/assignments/:id/submissions',
  authorize('teacher'),
  [
    param('id').isUUID().withMessage('Assignment id must be a valid UUID'),
    query('status').optional({ values: 'falsy' }).isIn(['submitted', 'graded']),
    validateRequest,
  ],
  assignmentController.getAllSubmissions
);

router.get('/student/submissions', authorize('student'), assignmentController.getMySubmissions);

module.exports = router;

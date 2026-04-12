const express = require('express');
const { param, query } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize('teacher'));

router.get(
  '/pending-grading',
  [
    query('courseId').optional({ values: 'falsy' }).isUUID().withMessage('Course id must be a valid UUID'),
    query('sort')
      .optional({ values: 'falsy' })
      .isIn(['oldest', 'newest', 'course'])
      .withMessage('Sort must be oldest, newest, or course'),
    validateRequest,
  ],
  teacherController.getPendingGrading
);

router.get(
  '/gradebook/:courseId',
  [param('courseId').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  teacherController.getGradebook
);

router.get(
  '/analytics/:courseId',
  [param('courseId').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  teacherController.getAnalytics
);

module.exports = router;

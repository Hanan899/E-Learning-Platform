const express = require('express');
const { param } = require('express-validator');
const progressController = require('../controllers/progressController');
const { authenticate, authorize, USER_ROLES } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize(...USER_ROLES));

router.get('/student/dashboard', authorize('student'), progressController.getStudentDashboard);
router.get('/teacher/dashboard', authorize('teacher'), progressController.getTeacherDashboard);

router.get(
  '/courses/:id/progress',
  authorize('teacher', 'admin'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  progressController.getCourseProgress
);

router.get(
  '/student/courses/:id/progress',
  authorize('student'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  progressController.getStudentCourseProgress
);

module.exports = router;

const express = require('express');
const { body, param, query } = require('express-validator');
const courseController = require('../controllers/courseController');
const { authenticate, authorize, USER_ROLES } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize(...USER_ROLES));

router.post(
  '/',
  authorize('teacher', 'admin'),
  uploadSingle('thumbnail'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('category').optional().isString(),
    validateRequest,
  ],
  courseController.createCourse
);

router.get(
  '/',
  [
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest,
  ],
  courseController.getAllCourses
);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.getCourse
);

router.put(
  '/:id',
  authorize('teacher', 'admin'),
  uploadSingle('thumbnail'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.updateCourse
);

router.delete(
  '/:id',
  authorize('teacher', 'admin'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.deleteCourse
);

router.put(
  '/:id/publish',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.publishCourse
);

router.post(
  '/:id/enroll',
  authorize('student'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.enrollStudent
);

router.delete(
  '/:id/enroll',
  authorize('student'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.unenrollStudent
);

router.get(
  '/:id/students',
  authorize('teacher', 'admin'),
  [param('id').isUUID().withMessage('Course id must be a valid UUID'), validateRequest],
  courseController.getEnrolledStudents
);

module.exports = router;

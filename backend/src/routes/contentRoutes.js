const express = require('express');
const { body, param } = require('express-validator');
const contentController = require('../controllers/contentController');
const { authenticate, authorize, USER_ROLES } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize(...USER_ROLES));

router.post(
  '/courses/:courseId/sections',
  authorize('teacher'),
  [
    param('courseId').isUUID().withMessage('Course id must be a valid UUID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('order').optional().isInt({ min: 1 }),
    validateRequest,
  ],
  contentController.createSection
);

router.put(
  '/courses/:courseId/sections/reorder',
  authorize('teacher'),
  [
    param('courseId').isUUID().withMessage('Course id must be a valid UUID'),
    body('sections').isArray().withMessage('Sections must be an array'),
    validateRequest,
  ],
  contentController.reorderSections
);

router.put(
  '/sections/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Section id must be a valid UUID'), validateRequest],
  contentController.updateSection
);

router.delete(
  '/sections/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Section id must be a valid UUID'), validateRequest],
  contentController.deleteSection
);

router.post(
  '/sections/:sectionId/lessons',
  authorize('teacher'),
  [
    param('sectionId').isUUID().withMessage('Section id must be a valid UUID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').optional().isString(),
    body('order').optional().isInt({ min: 1 }),
    validateRequest,
  ],
  contentController.createLesson
);

router.put(
  '/lessons/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Lesson id must be a valid UUID'), validateRequest],
  contentController.updateLesson
);

router.delete(
  '/lessons/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Lesson id must be a valid UUID'), validateRequest],
  contentController.deleteLesson
);

router.post(
  '/lessons/:lessonId/materials',
  authorize('teacher'),
  uploadSingle('file'),
  [param('lessonId').isUUID().withMessage('Lesson id must be a valid UUID'), validateRequest],
  contentController.uploadMaterial
);

router.delete(
  '/materials/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Material id must be a valid UUID'), validateRequest],
  contentController.deleteMaterial
);

router.post(
  '/lessons/:id/complete',
  authorize('student'),
  [param('id').isUUID().withMessage('Lesson id must be a valid UUID'), validateRequest],
  contentController.markLessonComplete
);

module.exports = router;

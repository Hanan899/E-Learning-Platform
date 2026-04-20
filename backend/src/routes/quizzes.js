const express = require('express');
const { body, param } = require('express-validator');
const quizController = require('../controllers/quizController');
const { authenticate, authorize, USER_ROLES } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize(...USER_ROLES));

router.post(
  '/courses/:courseId/quizzes',
  authorize('teacher'),
  [
    param('courseId').isUUID().withMessage('Course id must be a valid UUID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('timeLimit').optional({ values: 'falsy' }).isInt({ min: 1, max: 180 }),
    validateRequest,
  ],
  quizController.createQuiz
);

router.put(
  '/quizzes/:id',
  authorize('teacher'),
  [
    param('id').isUUID().withMessage('Quiz id must be a valid UUID'),
    body('title').optional({ values: 'falsy' }).isString(),
    body('timeLimit').optional({ nullable: true }).isInt({ min: 1, max: 180 }),
    validateRequest,
  ],
  quizController.updateQuiz
);

router.post(
  '/quizzes/:quizId/questions',
  authorize('teacher'),
  [
    param('quizId').isUUID().withMessage('Quiz id must be a valid UUID'),
    body('text').trim().notEmpty().withMessage('Question text is required'),
    body('options').isArray().withMessage('Options must be an array'),
    body('correctOption').isString().withMessage('correctOption is required'),
    body('points').isInt({ min: 1, max: 10 }).withMessage('Points must be between 1 and 10'),
    body('order').optional().isInt({ min: 1 }),
    validateRequest,
  ],
  quizController.addQuestion
);

router.put(
  '/questions/:id',
  authorize('teacher'),
  [
    param('id').isUUID().withMessage('Question id must be a valid UUID'),
    body('text').optional({ values: 'falsy' }).isString(),
    body('options').optional().isArray().withMessage('Options must be an array'),
    body('correctOption').optional({ values: 'falsy' }).isString(),
    body('points').optional().isInt({ min: 1, max: 10 }).withMessage('Points must be between 1 and 10'),
    body('order').optional().isInt({ min: 1 }),
    validateRequest,
  ],
  quizController.updateQuestion
);

router.delete(
  '/questions/:id',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Question id must be a valid UUID'), validateRequest],
  quizController.deleteQuestion
);

router.get(
  '/quizzes/:id',
  [param('id').isUUID().withMessage('Quiz id must be a valid UUID'), validateRequest],
  quizController.getQuiz
);

router.post(
  '/quizzes/:id/attempt',
  authorize('student'),
  [
    param('id').isUUID().withMessage('Quiz id must be a valid UUID'),
    body('answers').isObject().withMessage('Answers must be an object'),
    validateRequest,
  ],
  quizController.submitQuizAttempt
);

router.get(
  '/quizzes/:id/results',
  authorize('teacher'),
  [param('id').isUUID().withMessage('Quiz id must be a valid UUID'), validateRequest],
  quizController.getQuizResults
);

router.get('/student/quiz-attempts', authorize('student'), quizController.getMyQuizAttempts);

module.exports = router;

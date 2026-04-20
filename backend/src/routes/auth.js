const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, authorize, USER_ROLES } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const passwordRule =
  /^(?=.*[A-Z])(?=.*\d).{8,}$/;

router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('role')
      .optional()
      .isIn(['student', 'teacher'])
      .withMessage('Role must be student or teacher'),
    body('password')
      .matches(passwordRule)
      .withMessage(
        'Password must be at least 8 characters and include 1 uppercase letter and 1 number'
      ),
    validateRequest,
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  authController.login
);

router.get('/me', authenticate, authorize(...USER_ROLES), authController.getMe);

router.put(
  '/profile',
  [
    authenticate,
    authorize(...USER_ROLES),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('avatar').optional({ nullable: true }).isString().withMessage('Avatar must be a string'),
    validateRequest,
  ],
  authController.updateProfile
);

router.put(
  '/change-password',
  [
    authenticate,
    authorize(...USER_ROLES),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .matches(passwordRule)
      .withMessage(
        'Password must be at least 8 characters and include 1 uppercase letter and 1 number'
      ),
    validateRequest,
  ],
  authController.changePassword
);

module.exports = router;

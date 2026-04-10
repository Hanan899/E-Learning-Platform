const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get(
  '/users',
  [
    query('role')
      .optional({ values: 'falsy' })
      .isIn(['admin', 'teacher', 'student'])
      .withMessage('Role filter must be admin, teacher, or student'),
    query('search').optional({ values: 'falsy' }).isString(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    validateRequest,
  ],
  adminController.getAllUsers
);

router.put(
  '/users/:id/role',
  [
    param('id').isUUID().withMessage('User id must be a valid UUID'),
    body('role')
      .isIn(['admin', 'teacher', 'student'])
      .withMessage('Role must be admin, teacher, or student'),
    validateRequest,
  ],
  adminController.updateUserRole
);

router.put(
  '/users/:id/status',
  [param('id').isUUID().withMessage('User id must be a valid UUID'), validateRequest],
  adminController.toggleUserStatus
);

router.delete(
  '/users/:id',
  [param('id').isUUID().withMessage('User id must be a valid UUID'), validateRequest],
  adminController.deleteUser
);

router.get('/stats', adminController.getDashboardStats);

module.exports = router;

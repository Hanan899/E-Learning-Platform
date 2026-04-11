const express = require('express');
const { param, query } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticate);

router.get(
  '/notifications',
  [
    query('unread').optional().isBoolean().withMessage('Unread must be true or false'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest,
  ],
  notificationController.getNotifications
);

router.get('/notifications/count', notificationController.getUnreadCount);

router.put(
  '/notifications/read-all',
  notificationController.markAllAsRead
);

router.put(
  '/notifications/:id/read',
  [param('id').isUUID().withMessage('Notification id must be a valid UUID'), validateRequest],
  notificationController.markAsRead
);

router.delete(
  '/notifications/:id',
  [param('id').isUUID().withMessage('Notification id must be a valid UUID'), validateRequest],
  notificationController.deleteNotification
);

module.exports = router;

const { Notification } = require('../models');
const { error, paginate, success } = require('../utils/responseHelper');

const serializeNotification = (notification) => ({
  id: notification.id,
  userId: notification.userId,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

const getUnreadFilter = (value) => String(value).toLowerCase() === 'true';

const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const unreadOnly = getUnreadFilter(req.query.unread);

    const whereClause = {
      userId: req.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [result, unreadCount] = await Promise.all([
      Notification.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }),
      Notification.count({
        where: {
          userId: req.user.id,
          isRead: false,
        },
      }),
    ]);

    return paginate(
      res,
      {
        notifications: result.rows.map(serializeNotification),
        unreadCount,
      },
      result.count,
      page,
      limit
    );
  } catch (err) {
    return next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    if (notification.userId !== req.user.id) {
      return error(res, 'You do not have access to this notification', 403);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    return success(res, { notification: serializeNotification(notification) }, 'Notification marked as read');
  } catch (err) {
    return next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user.id,
          isRead: false,
        },
      }
    );

    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    return next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    if (notification.userId !== req.user.id) {
      return error(res, 'You do not have access to this notification', 403);
    }

    await notification.destroy();

    return success(res, null, 'Notification deleted');
  } catch (err) {
    return next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    return success(res, { unreadCount });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};

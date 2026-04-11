const { Notification } = require('../models');

const createNotification = async (userId, { title, message, type }) =>
  Notification.create({
    userId,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
  });

const createNotifications = async (userIds, payload) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  return Promise.all(userIds.map((userId) => createNotification(userId, payload)));
};

module.exports = {
  createNotification,
  createNotifications,
};

const { Model } = require('sequelize');
const { enumField } = require('../utils/modelHelpers');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {}

  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: enumField(sequelize, DataTypes, ['grade', 'announcement', 'deadline', 'enrollment'], {
        allowNull: false,
      }),
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      updatedAt: false,
    }
  );

  return Notification;
};

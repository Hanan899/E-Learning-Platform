const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LessonProgress extends Model {}

  LessonProgress.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LessonProgress',
      tableName: 'lesson_progress',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['studentId', 'lessonId'],
        },
      ],
    }
  );

  return LessonProgress;
};

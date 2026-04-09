const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class QuizAttempt extends Model {}

  QuizAttempt.init(
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
      quizId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'QuizAttempt',
      tableName: 'quiz_attempts',
      timestamps: false,
    }
  );

  return QuizAttempt;
};

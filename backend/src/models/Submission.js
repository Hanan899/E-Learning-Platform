const { Model } = require('sequelize');
const { enumField } = require('../utils/modelHelpers');

module.exports = (sequelize, DataTypes) => {
  class Submission extends Model {}

  Submission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: enumField(DataTypes, ['submitted', 'graded'], {
        allowNull: false,
        defaultValue: 'submitted',
      }),
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      assignmentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Submission',
      tableName: 'submissions',
      timestamps: false,
    }
  );

  return Submission;
};

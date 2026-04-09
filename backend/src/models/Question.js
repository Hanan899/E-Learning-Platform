const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {}

  Question.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      options: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      correctOption: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      quizId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Question',
      tableName: 'questions',
      timestamps: false,
    }
  );

  return Question;
};

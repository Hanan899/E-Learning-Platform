const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Assignment extends Model {}

  Assignment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      maxScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Assignment',
      tableName: 'assignments',
      timestamps: false,
    }
  );

  return Assignment;
};

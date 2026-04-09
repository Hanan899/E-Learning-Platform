const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Section extends Model {}

  Section.init(
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
      order: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Section',
      tableName: 'sections',
      timestamps: false,
    }
  );

  return Section;
};

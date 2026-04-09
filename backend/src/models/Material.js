const { Model } = require('sequelize');
const { enumField } = require('../utils/modelHelpers');

module.exports = (sequelize, DataTypes) => {
  class Material extends Model {}

  Material.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      type: enumField(DataTypes, ['pdf', 'image', 'video_link', 'document'], {
        allowNull: false,
      }),
      filePath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Material',
      tableName: 'materials',
      timestamps: false,
    }
  );

  return Material;
};

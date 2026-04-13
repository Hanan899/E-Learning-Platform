const enumField = (sequelize, DataTypes, values, options = {}) => ({
  ...options,
  type:
    process.env.NODE_ENV === 'test' || sequelize?.getDialect?.() === 'sqlite'
      ? DataTypes.STRING
      : DataTypes.ENUM(...values),
  validate: {
    ...(options.validate || {}),
    isIn: [values],
  },
});

module.exports = {
  enumField,
};

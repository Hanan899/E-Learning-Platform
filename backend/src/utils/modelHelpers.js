const enumField = (DataTypes, values, options = {}) => ({
  ...options,
  type: process.env.NODE_ENV === 'test' ? DataTypes.STRING : DataTypes.ENUM(...values),
  validate: {
    ...(options.validate || {}),
    isIn: [values],
  },
});

module.exports = {
  enumField,
};

const { DataTypes } = require('sequelize');
const { connectDatabase } = require('../config/database');
const { sequelize } = require('../models');

const sync = async () => {
  await connectDatabase(sequelize);
  await sequelize.sync();
  const queryInterface = sequelize.getQueryInterface();
  const questionTable = await queryInterface.describeTable('questions');

  if (!questionTable.order) {
    await queryInterface.addColumn('questions', 'order', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  }

  console.log('Database synchronized successfully');
};

if (require.main === module) {
  sync()
    .then(() => sequelize.close())
    .catch((err) => {
      console.error('Failed to synchronize database:', err);
      process.exitCode = 1;
    });
}

module.exports = sync;

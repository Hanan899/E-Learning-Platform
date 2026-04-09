const { sequelize } = require('../models');

const sync = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
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

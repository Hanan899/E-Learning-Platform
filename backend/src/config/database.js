const path = require('path');
const { Sequelize } = require('sequelize');
const { newDb } = require('pg-mem');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const isTestEnvironment = process.env.NODE_ENV === 'test';
const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

let sequelize;

if (isTestEnvironment) {
  const inMemoryDb = newDb({ autoCreateForeignKeyIndices: true });
  const dialectModule = inMemoryDb.adapters.createPg();

  sequelize = new Sequelize(
    process.env.DB_NAME || 'elearning_test',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      ...commonOptions,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialectModule,
      logging: false,
    }
  );
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      ...commonOptions,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
    }
  );
}

const connectDatabase = async () => {
  await sequelize.authenticate();
  return sequelize;
};

const syncDatabase = async (options = {}) => sequelize.sync(options);

module.exports = {
  sequelize,
  connectDatabase,
  syncDatabase,
};

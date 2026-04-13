const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '../..');
const defaultTestStorage = path.resolve(backendRoot, '.tmp', `test-${process.pid}.sqlite`);

dotenv.config({ path: path.resolve(backendRoot, '.env'), quiet: true });

const resolveSqliteStorage = (storagePath) => {
  if (!storagePath || storagePath === ':memory:') {
    return storagePath;
  }

  return path.isAbsolute(storagePath)
    ? storagePath
    : path.resolve(backendRoot, storagePath);
};

const ensureSqliteStorageDirectory = (storagePath) => {
  if (!storagePath || storagePath === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
};

const createSequelizeInstance = (config = {}) => {
  const dialect = config.dialect || process.env.DB_DIALECT || 'sqlite';
  const logging = Object.prototype.hasOwnProperty.call(config, 'logging')
    ? config.logging
    : process.env.NODE_ENV === 'development'
      ? console.log
      : false;

  if (dialect === 'sqlite') {
    const storage = resolveSqliteStorage(
      config.storage ||
        process.env.SQLITE_STORAGE ||
        (process.env.NODE_ENV === 'test'
          ? defaultTestStorage
          : './data/elearning.sqlite')
    );

    ensureSqliteStorageDirectory(storage);

    return new Sequelize({
      dialect: 'sqlite',
      storage,
      logging,
      pool: {
        max: 1,
        min: 0,
        idle: 10000,
        acquire: 30000,
      },
    });
  }

  if (dialect !== 'postgres') {
    throw new Error(`Unsupported database dialect: ${dialect}`);
  }

  return new Sequelize(
    config.database || process.env.DB_NAME,
    config.username || process.env.DB_USER,
    config.password || process.env.DB_PASSWORD,
    {
      dialect: 'postgres',
      host: config.host || process.env.DB_HOST || 'localhost',
      port: Number(config.port || process.env.DB_PORT || 5432),
      logging,
    }
  );
};

const sequelize = createSequelizeInstance();

const connectDatabase = async (targetSequelize = sequelize) => {
  await targetSequelize.authenticate();

  if (targetSequelize.getDialect() === 'sqlite') {
    await targetSequelize.query('PRAGMA foreign_keys = ON');
  }

  return targetSequelize;
};

const syncDatabase = async (options = {}, targetSequelize = sequelize) => {
  await connectDatabase(targetSequelize);
  return targetSequelize.sync(options);
};

module.exports = {
  backendRoot,
  createSequelizeInstance,
  resolveSqliteStorage,
  sequelize,
  connectDatabase,
  syncDatabase,
};

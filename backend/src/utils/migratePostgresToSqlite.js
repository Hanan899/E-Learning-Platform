const { createSequelizeInstance, connectDatabase } = require('../config/database');
const { initializeModels } = require('../models');

const migrationTables = [
  ['users', 'User'],
  ['courses', 'Course'],
  ['sections', 'Section'],
  ['lessons', 'Lesson'],
  ['materials', 'Material'],
  ['enrollments', 'Enrollment'],
  ['assignments', 'Assignment'],
  ['submissions', 'Submission'],
  ['quizzes', 'Quiz'],
  ['questions', 'Question'],
  ['quiz_attempts', 'QuizAttempt'],
  ['notifications', 'Notification'],
  ['lesson_progress', 'LessonProgress'],
];

const getRequiredSourceConfig = () => {
  const requiredKeys = ['SOURCE_PG_HOST', 'SOURCE_PG_NAME', 'SOURCE_PG_USER', 'SOURCE_PG_PASSWORD'];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing source Postgres configuration: ${missingKeys.join(', ')}`
    );
  }

  return {
    dialect: 'postgres',
    host: process.env.SOURCE_PG_HOST,
    port: Number(process.env.SOURCE_PG_PORT || 5432),
    database: process.env.SOURCE_PG_NAME,
    username: process.env.SOURCE_PG_USER,
    password: process.env.SOURCE_PG_PASSWORD,
    logging: false,
  };
};

const getTargetSqliteConfig = () => {
  const targetDialect = process.env.DB_DIALECT || 'sqlite';

  if (targetDialect !== 'sqlite') {
    throw new Error(
      `Target DB_DIALECT must be sqlite for this migration. Received: ${targetDialect}`
    );
  }

  return {
    dialect: 'sqlite',
    storage: process.env.SQLITE_STORAGE || './data/elearning.sqlite',
    logging: false,
  };
};

const migrateTable = async (tableName, modelName, sourceModels, targetModels) => {
  const sourceModel = sourceModels[modelName];
  const targetModel = targetModels[modelName];
  const rows = await sourceModel.findAll({ raw: true });

  if (rows.length > 0) {
    await targetModel.bulkCreate(rows, {
      validate: false,
      hooks: false,
    });
  }

  const [sourceCount, targetCount] = await Promise.all([
    sourceModel.count(),
    targetModel.count(),
  ]);

  console.log(`${tableName}: source=${sourceCount} target=${targetCount}`);

  if (sourceCount !== targetCount) {
    throw new Error(
      `Row count mismatch for ${tableName}: source=${sourceCount}, target=${targetCount}`
    );
  }
};

const migrate = async () => {
  const sourceSequelize = createSequelizeInstance(getRequiredSourceConfig());
  const targetSequelize = createSequelizeInstance(getTargetSqliteConfig());

  try {
    const sourceModels = initializeModels(sourceSequelize);
    const targetModels = initializeModels(targetSequelize);

    await connectDatabase(sourceSequelize);
    await connectDatabase(targetSequelize);
    await targetSequelize.sync({ force: true });

    console.log('Migrating Postgres data into SQLite...');
    for (const [tableName, modelName] of migrationTables) {
      await migrateTable(tableName, modelName, sourceModels, targetModels);
    }

    console.log('Postgres to SQLite migration completed successfully.');
  } finally {
    await Promise.allSettled([sourceSequelize.close(), targetSequelize.close()]);
  }
};

if (require.main === module) {
  migrate().catch((error) => {
    console.error('Postgres to SQLite migration failed:', error);
    process.exitCode = 1;
  });
}

module.exports = migrate;

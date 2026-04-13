const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.DB_DIALECT = process.env.DB_DIALECT || 'sqlite';
process.env.SQLITE_STORAGE =
  process.env.SQLITE_STORAGE ||
  path.resolve(__dirname, '../.tmp', `test-${process.pid}.sqlite`);
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

fs.mkdirSync(path.dirname(process.env.SQLITE_STORAGE), { recursive: true });
if (fs.existsSync(process.env.SQLITE_STORAGE)) {
  fs.rmSync(process.env.SQLITE_STORAGE, { force: true });
}

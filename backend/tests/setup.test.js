const express = require('express');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { uploadSingle } = require('../src/middleware/upload');
const errorHandler = require('../src/middleware/errorHandler');

describe('Database Connection', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('connects to SQLite successfully', async () => {
    await expect(sequelize.authenticate()).resolves.toBeUndefined();
    expect(sequelize.getDialect()).toBe('sqlite');
  });

  test('all models are synced', async () => {
    const tables = await sequelize.getQueryInterface().showAllTables();

    expect(tables.length).toBeGreaterThan(0);
  });
});

describe('Middleware', () => {
  test('auth middleware rejects missing token with 401', async () => {
    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('auth middleware rejects invalid token with 401', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('upload middleware rejects files over 10MB', async () => {
    const uploadTestApp = express();

    uploadTestApp.post('/upload', uploadSingle('file'), (req, res) => {
      res.status(200).json({ success: true });
    });
    uploadTestApp.use(errorHandler);

    const oversizedFile = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');
    const res = await request(uploadTestApp)
      .post('/upload')
      .attach('file', oversizedFile, {
        filename: 'large-file.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('10MB');
  });

  test('upload middleware accepts supported file types under the size limit', async () => {
    const uploadTestApp = express();

    uploadTestApp.post('/upload', uploadSingle('file'), (req, res) => {
      res.status(200).json({
        success: true,
        fileName: path.basename(req.file.path),
      });
    });
    uploadTestApp.use(errorHandler);

    const res = await request(uploadTestApp)
      .post('/upload')
      .attach('file', Buffer.from('sample pdf content'), {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

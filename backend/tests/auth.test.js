const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { Notification, User, sequelize } = require('../src/models');

const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

describe('Authentication API', () => {
  let admin;
  let teacher;
  let student;
  let inactiveStudent;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Notification.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    const now = new Date();

    admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@school.com',
      password: 'Admin1234',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    teacher = await User.create({
      firstName: 'Teacher',
      lastName: 'User',
      email: 'teacher@school.com',
      password: 'Teacher1234',
      role: 'teacher',
      createdAt: now,
      updatedAt: now,
    });

    student = await User.create({
      firstName: 'Student',
      lastName: 'User',
      email: 'student@school.com',
      password: 'Student1234',
      role: 'student',
      createdAt: now,
      updatedAt: now,
    });

    inactiveStudent = await User.create({
      firstName: 'Inactive',
      lastName: 'User',
      email: 'inactive@school.com',
      password: 'Student1234',
      role: 'student',
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    test('registers a new student successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Test1234!',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user).not.toHaveProperty('password');

      const welcomeNotification = await Notification.findOne({
        where: { userId: res.body.data.user.id },
      });
      expect(welcomeNotification).not.toBeNull();
    });

    test('rejects duplicate email with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Another',
        lastName: 'User',
        email: 'teacher@school.com',
        password: 'Test1234!',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email already exists');
    });

    test('rejects weak password with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Weak',
        lastName: 'Password',
        email: 'weak@example.com',
        password: 'weakpass',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Validation failed');
    });

    test('rejects invalid email format with 400', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Bad',
        lastName: 'Email',
        email: 'not-an-email',
        password: 'Test1234!',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    test('returns token on valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'TEACHER@school.com',
        password: 'Teacher1234',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('teacher@school.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    test('returns 401 on wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'teacher@school.com',
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    test('returns 403 on deactivated account', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'inactive@school.com',
        password: 'Student1234',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Account deactivated');
    });
  });

  describe('Admin User Management', () => {
    test('admin can list all users with pagination', async () => {
      const token = createToken(admin);
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
    });

    test('admin can list all users when role query is blank', async () => {
      const token = createToken(admin);
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=10&role=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
      expect(res.body.data.users.some((user) => user.role === 'admin')).toBe(true);
      expect(res.body.data.users.some((user) => user.role === 'teacher')).toBe(true);
      expect(res.body.data.users.some((user) => user.role === 'student')).toBe(true);
    });

    test('admin can change user role', async () => {
      const token = createToken(admin);
      const res = await request(app)
        .put(`/api/admin/users/${student.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'teacher' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('teacher');

      await student.reload();
      expect(student.role).toBe('teacher');
    });

    test('non-admin gets 403 on admin endpoints', async () => {
      const token = createToken(teacher);
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});

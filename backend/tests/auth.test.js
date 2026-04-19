const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Material,
  Notification,
  Question,
  Quiz,
  QuizAttempt,
  Section,
  Submission,
  User,
  sequelize,
} = require('../src/models');

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

  beforeEach(async () => {
    await sequelize.sync({ force: true });
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

    test('registers a new teacher and notifies admins for verification', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Taylor',
        lastName: 'Instructor',
        email: 'taylor@school.com',
        password: 'Teacher1234',
        role: 'teacher',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('teacher');

      const teacherNotification = await Notification.findOne({
        where: { userId: res.body.data.user.id },
      });
      expect(teacherNotification).not.toBeNull();
      expect(teacherNotification.message).toContain('admin has been notified');

      const adminNotification = await Notification.findOne({
        where: { userId: admin.id, title: 'New teacher registration' },
      });
      expect(adminNotification).not.toBeNull();
      expect(adminNotification.message).toContain('registered as a teacher');
      expect(adminNotification.message).toContain('taylor@school.com');
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

    test('admin can permanently delete a student and related records', async () => {
      const token = createToken(admin);
      const now = new Date();
      const submissionFilePath = path.resolve(__dirname, '../.tmp', `submission-${student.id}.pdf`);

      fs.writeFileSync(submissionFilePath, 'student submission');

      const course = await Course.create({
        title: 'Biology',
        description: 'Foundations',
        category: 'Science',
        teacherId: teacher.id,
        createdAt: now,
        updatedAt: now,
      });

      const section = await Section.create({
        title: 'Unit 1',
        order: 1,
        courseId: course.id,
        createdAt: now,
        updatedAt: now,
      });

      const lesson = await Lesson.create({
        title: 'Cells',
        content: 'Cell structure',
        order: 1,
        sectionId: section.id,
        courseId: course.id,
        createdAt: now,
        updatedAt: now,
      });

      const assignment = await Assignment.create({
        title: 'Worksheet',
        description: 'Complete the worksheet',
        courseId: course.id,
        teacherId: teacher.id,
      });

      const quiz = await Quiz.create({
        title: 'Lesson quiz',
        courseId: course.id,
        timeLimit: 10,
      });

      await Promise.all([
        Enrollment.create({
          studentId: student.id,
          courseId: course.id,
        }),
        Submission.create({
          assignmentId: assignment.id,
          studentId: student.id,
          filePath: submissionFilePath,
          status: 'submitted',
        }),
        QuizAttempt.create({
          studentId: student.id,
          quizId: quiz.id,
          answers: { 1: 'A' },
          score: 80,
          completedAt: now,
        }),
        LessonProgress.create({
          studentId: student.id,
          lessonId: lesson.id,
          courseId: course.id,
          completedAt: now,
        }),
        Notification.create({
          userId: student.id,
          title: 'Reminder',
          message: 'Study for the quiz',
          type: 'deadline',
          createdAt: now,
        }),
      ]);

      const res = await request(app)
        .delete(`/api/admin/users/${student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('User deleted successfully');
      await expect(User.findByPk(student.id)).resolves.toBeNull();
      await expect(Enrollment.count({ where: { studentId: student.id } })).resolves.toBe(0);
      await expect(Submission.count({ where: { studentId: student.id } })).resolves.toBe(0);
      await expect(QuizAttempt.count({ where: { studentId: student.id } })).resolves.toBe(0);
      await expect(LessonProgress.count({ where: { studentId: student.id } })).resolves.toBe(0);
      await expect(Notification.count({ where: { userId: student.id } })).resolves.toBe(0);
      expect(fs.existsSync(submissionFilePath)).toBe(false);
    });

    test('admin can permanently delete a teacher and owned course content', async () => {
      const token = createToken(admin);
      const now = new Date();
      const thumbnailPath = path.resolve(__dirname, '../.tmp', `course-${teacher.id}.png`);
      const materialFilePath = path.resolve(__dirname, '../.tmp', `material-${teacher.id}.pdf`);
      const submissionFilePath = path.resolve(__dirname, '../.tmp', `teacher-course-submission-${teacher.id}.pdf`);

      fs.writeFileSync(thumbnailPath, 'thumbnail');
      fs.writeFileSync(materialFilePath, 'material');
      fs.writeFileSync(submissionFilePath, 'submission');

      const course = await Course.create({
        title: 'Physics',
        description: 'Motion and forces',
        category: 'Science',
        teacherId: teacher.id,
        thumbnail: thumbnailPath,
        createdAt: now,
        updatedAt: now,
      });

      const section = await Section.create({
        title: 'Unit 1',
        order: 1,
        courseId: course.id,
        createdAt: now,
        updatedAt: now,
      });

      const lesson = await Lesson.create({
        title: 'Velocity',
        content: 'Vectors and speed',
        order: 1,
        sectionId: section.id,
        courseId: course.id,
        createdAt: now,
        updatedAt: now,
      });

      const assignment = await Assignment.create({
        title: 'Lab report',
        description: 'Describe the experiment',
        courseId: course.id,
        teacherId: teacher.id,
      });

      const quiz = await Quiz.create({
        title: 'Motion quiz',
        courseId: course.id,
        timeLimit: 10,
      });

      await Promise.all([
        Material.create({
          title: 'Notes',
          type: 'pdf',
          filePath: materialFilePath,
          lessonId: lesson.id,
          courseId: course.id,
        }),
        Submission.create({
          assignmentId: assignment.id,
          studentId: student.id,
          filePath: submissionFilePath,
          status: 'submitted',
        }),
        Question.create({
          quizId: quiz.id,
          text: 'What is velocity?',
          options: ['Speed with direction', 'Mass', 'Force', 'Energy'],
          correctOption: '0',
          order: 1,
          points: 5,
        }),
      ]);

      const res = await request(app)
        .delete(`/api/admin/users/${teacher.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });

      expect(res.status).toBe(200);
      await expect(User.findByPk(teacher.id)).resolves.toBeNull();
      await expect(Course.findByPk(course.id)).resolves.toBeNull();
      await expect(Assignment.count({ where: { courseId: course.id } })).resolves.toBe(0);
      await expect(Material.count({ where: { courseId: course.id } })).resolves.toBe(0);
      await expect(Submission.count({ where: { assignmentId: assignment.id } })).resolves.toBe(0);
      expect(fs.existsSync(thumbnailPath)).toBe(false);
      expect(fs.existsSync(materialFilePath)).toBe(false);
      expect(fs.existsSync(submissionFilePath)).toBe(false);
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

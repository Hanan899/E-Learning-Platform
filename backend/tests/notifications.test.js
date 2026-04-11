const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Assignment,
  Course,
  Enrollment,
  Notification,
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

describe('Notifications', () => {
  let teacher;
  let student;
  let secondStudent;
  let course;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Notification.destroy({ where: {}, truncate: true, cascade: true });
    await Assignment.destroy({ where: {}, truncate: true, cascade: true });
    await Enrollment.destroy({ where: {}, truncate: true, cascade: true });
    await Course.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    teacher = await User.create({
      firstName: 'Grace',
      lastName: 'Teacher',
      email: 'notify-teacher@school.com',
      password: 'Teacher1234',
      role: 'teacher',
    });

    student = await User.create({
      firstName: 'Amina',
      lastName: 'Student',
      email: 'notify-student@school.com',
      password: 'Student1234',
      role: 'student',
    });

    secondStudent = await User.create({
      firstName: 'Bilal',
      lastName: 'Student',
      email: 'notify-student-2@school.com',
      password: 'Student1234',
      role: 'student',
    });

    course = await Course.create({
      title: 'Notification Course',
      description: 'Used for notification checks.',
      category: 'Science',
      teacherId: teacher.id,
      isPublished: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('user receives notification on enrollment', async () => {
    const token = createToken(student);

    const res = await request(app)
      .post(`/api/courses/${course.id}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);

    const notification = await Notification.findOne({
      where: { userId: student.id },
      order: [['createdAt', 'DESC']],
    });

    expect(notification).not.toBeNull();
    expect(notification.type).toBe('enrollment');
    expect(notification.message).toContain(`Welcome to ${course.title}!`);
  });

  test('all students get notified on new assignment', async () => {
    await Enrollment.bulkCreate([
      {
        studentId: student.id,
        courseId: course.id,
        enrolledAt: new Date().toISOString(),
      },
      {
        studentId: secondStudent.id,
        courseId: course.id,
        enrolledAt: new Date().toISOString(),
      },
    ]);

    const token = createToken(teacher);
    const res = await request(app)
      .post(`/api/courses/${course.id}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Notification Assignment',
        description: 'This will notify both students.',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        maxScore: 100,
      });

    expect(res.status).toBe(201);
    expect(await Notification.count({ where: { type: 'deadline' } })).toBe(2);
  });

  test('marking notification as read updates isRead', async () => {
    const notification = await Notification.create({
      userId: student.id,
      title: 'Read me',
      message: 'Please mark this as read.',
      type: 'announcement',
    });

    const token = createToken(student);
    const res = await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    await notification.reload();
    expect(notification.isRead).toBe(true);
  });

  test("user cannot read another user's notification (403)", async () => {
    const notification = await Notification.create({
      userId: secondStudent.id,
      title: 'Private',
      message: 'Not yours.',
      type: 'announcement',
    });

    const token = createToken(student);
    const res = await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test('mark all read sets all to isRead=true', async () => {
    await Notification.bulkCreate([
      {
        userId: student.id,
        title: 'First',
        message: 'Unread one',
        type: 'announcement',
      },
      {
        userId: student.id,
        title: 'Second',
        message: 'Unread two',
        type: 'deadline',
      },
    ]);

    const token = createToken(student);
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await Notification.count({ where: { userId: student.id, isRead: false } })).toBe(0);
  });

  test('count endpoint returns correct unread count', async () => {
    await Notification.bulkCreate([
      {
        userId: student.id,
        title: 'Unread one',
        message: 'Still unread',
        type: 'announcement',
        isRead: false,
      },
      {
        userId: student.id,
        title: 'Unread two',
        message: 'Still unread too',
        type: 'grade',
        isRead: false,
      },
      {
        userId: student.id,
        title: 'Read already',
        message: 'Done',
        type: 'deadline',
        isRead: true,
      },
    ]);

    const token = createToken(student);
    const res = await request(app)
      .get('/api/notifications/count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(2);
  });
});

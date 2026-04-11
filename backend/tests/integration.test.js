const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
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

describe('Full E2E Flow', () => {
  let teacher;
  let teacherToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Notification.destroy({ where: {}, truncate: true, cascade: true });
    await QuizAttempt.destroy({ where: {}, truncate: true, cascade: true });
    await Question.destroy({ where: {}, truncate: true, cascade: true });
    await Quiz.destroy({ where: {}, truncate: true, cascade: true });
    await Submission.destroy({ where: {}, truncate: true, cascade: true });
    await Assignment.destroy({ where: {}, truncate: true, cascade: true });
    await LessonProgress.destroy({ where: {}, truncate: true, cascade: true });
    await Lesson.destroy({ where: {}, truncate: true, cascade: true });
    await Section.destroy({ where: {}, truncate: true, cascade: true });
    await Enrollment.destroy({ where: {}, truncate: true, cascade: true });
    await Course.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    teacher = await User.create({
      firstName: 'Grace',
      lastName: 'Teacher',
      email: 'teacher-flow@school.com',
      password: 'Teacher1234',
      role: 'teacher',
    });
    teacherToken = createToken(teacher);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('complete student learning flow', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      firstName: 'Amina',
      lastName: 'Student',
      email: 'student-flow@school.com',
      password: 'Student1234!',
    });

    expect(registerRes.status).toBe(201);
    const studentToken = registerRes.body.data.token;
    const studentId = registerRes.body.data.user.id;

    const createCourseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Integrated Science',
        description: 'An end to end test course for the platform.',
        category: 'Science',
      });

    expect(createCourseRes.status).toBe(201);
    const courseId = createCourseRes.body.data.course.id;

    const createSectionRes = await request(app)
      .post(`/api/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Week 1', order: 1 });

    expect(createSectionRes.status).toBe(201);
    const sectionId = createSectionRes.body.data.section.id;

    const createLessonRes = await request(app)
      .post(`/api/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Introduction', content: 'Welcome to the course', order: 1 });

    expect(createLessonRes.status).toBe(201);
    const lessonId = createLessonRes.body.data.lesson.id;

    const publishRes = await request(app)
      .put(`/api/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.course.isPublished).toBe(true);

    const enrollRes = await request(app)
      .post(`/api/courses/${courseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(enrollRes.status).toBe(201);

    const completeLessonRes = await request(app)
      .post(`/api/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(completeLessonRes.status).toBe(200);
    expect(completeLessonRes.body.data.completionPercentage).toBe(100);

    const assignmentRes = await request(app)
      .post(`/api/courses/${courseId}/assignments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Lab Reflection',
        description: 'Write what you observed in the first lesson.',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 100,
      });

    expect(assignmentRes.status).toBe(201);
    const assignmentId = assignmentRes.body.data.assignment.id;

    const submitRes = await request(app)
      .post(`/api/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'I observed safe lab setup and clear instructions.' });

    expect(submitRes.status).toBe(201);

    const assignmentDetailRes = await request(app)
      .get(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(assignmentDetailRes.status).toBe(200);
    expect(assignmentDetailRes.body.data.assignment.submissions).toHaveLength(1);
    const submissionId = assignmentDetailRes.body.data.assignment.submissions[0].id;

    const gradeRes = await request(app)
      .put(`/api/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        score: 92,
        feedback: 'Strong work with clear observations.',
      });

    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.submission.status).toBe('graded');

    const studentAssignmentRes = await request(app)
      .get(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentAssignmentRes.status).toBe(200);
    expect(studentAssignmentRes.body.data.assignment.mySubmission.score).toBe(92);
    expect(studentAssignmentRes.body.data.assignment.mySubmission.feedback).toContain('Strong work');

    const notificationsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(notificationsRes.status).toBe(200);
    expect(notificationsRes.body.data.notifications.length).toBeGreaterThan(0);
    expect(
      notificationsRes.body.data.notifications.some((notification) =>
        notification.message.includes('Assignment graded: 92/100')
      )
    ).toBe(true);

    const [enrollment, lessonProgress, submission, notificationCount] = await Promise.all([
      Enrollment.findOne({ where: { studentId, courseId } }),
      LessonProgress.findOne({ where: { studentId, lessonId } }),
      Submission.findOne({ where: { studentId, assignmentId } }),
      Notification.count({ where: { userId: studentId } }),
    ]);

    expect(enrollment).not.toBeNull();
    expect(Number(enrollment.completionPercentage)).toBe(100);
    expect(lessonProgress).not.toBeNull();
    expect(submission.status).toBe('graded');
    expect(Number(submission.score)).toBe(92);
    expect(notificationCount).toBeGreaterThanOrEqual(3);
  });
});

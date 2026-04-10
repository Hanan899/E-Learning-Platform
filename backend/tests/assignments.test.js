const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Assignment,
  Course,
  Enrollment,
  Notification,
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

describe('Assignment Lifecycle', () => {
  let teacher;
  let student;
  let secondStudent;
  let course;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Notification.destroy({ where: {}, truncate: true, cascade: true });
    await Submission.destroy({ where: {}, truncate: true, cascade: true });
    await Assignment.destroy({ where: {}, truncate: true, cascade: true });
    await Enrollment.destroy({ where: {}, truncate: true, cascade: true });
    await Course.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    teacher = await User.create({
      firstName: 'Grace',
      lastName: 'Teacher',
      email: 'teacher@school.com',
      password: 'Teacher1234',
      role: 'teacher',
    });

    student = await User.create({
      firstName: 'Amina',
      lastName: 'Student',
      email: 'student@school.com',
      password: 'Student1234',
      role: 'student',
    });

    secondStudent = await User.create({
      firstName: 'Bilal',
      lastName: 'Student',
      email: 'student2@school.com',
      password: 'Student1234',
      role: 'student',
    });

    course = await Course.create({
      title: 'Mathematics 101',
      description: 'Core course',
      category: 'Math',
      teacherId: teacher.id,
      isPublished: true,
    });

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
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('teacher can create assignment in their course', async () => {
    const token = createToken(teacher);
    const res = await request(app)
      .post(`/api/courses/${course.id}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Weekly worksheet',
        description: 'Solve the attached set of algebra problems.',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        maxScore: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.assignment.title).toBe('Weekly worksheet');
    expect(await Notification.count()).toBe(2);
  });

  test('student cannot create assignment (403)', async () => {
    const token = createToken(student);
    const res = await request(app)
      .post(`/api/courses/${course.id}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Blocked',
        description: 'Blocked description',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        maxScore: 100,
      });

    expect(res.status).toBe(403);
  });

  test('student can submit assignment before deadline', async () => {
    const assignment = await Assignment.create({
      title: 'Essay',
      description: 'Write about number patterns.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 50,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const token = createToken(student);
    const res = await request(app)
      .post(`/api/assignments/${assignment.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'This is my written response.');

    expect(res.status).toBe(201);
    expect(res.body.data.submission.status).toBe('submitted');
    expect(await Submission.count()).toBe(1);
  });

  test('student can list pending assignments before submitting', async () => {
    const assignment = await Assignment.create({
      title: 'Visible pending work',
      description: 'This should appear in the student pending tab.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 50,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const token = createToken(student);
    const res = await request(app)
      .get(`/api/courses/${course.id}/assignments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.assignments).toHaveLength(1);
    expect(res.body.data.assignments[0].id).toBe(assignment.id);
    expect(res.body.data.assignments[0].mySubmission).toBeNull();
  });

  test('student cannot submit after deadline (400)', async () => {
    const assignment = await Assignment.create({
      title: 'Late work',
      description: 'This deadline has passed.',
      dueDate: new Date(Date.now() - 86400000).toISOString(),
      maxScore: 50,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const token = createToken(student);
    const res = await request(app)
      .post(`/api/assignments/${assignment.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Too late');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Deadline passed');
  });

  test('student cannot submit twice (400)', async () => {
    const assignment = await Assignment.create({
      title: 'Single submission',
      description: 'Submit once only.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 50,
      courseId: course.id,
      teacherId: teacher.id,
    });

    await Submission.create({
      content: 'First response',
      submittedAt: new Date().toISOString(),
      assignmentId: assignment.id,
      studentId: student.id,
    });

    const token = createToken(student);
    const res = await request(app)
      .post(`/api/assignments/${assignment.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .field('content', 'Second response');

    expect(res.status).toBe(400);
  });

  test('teacher can grade submission with score and feedback', async () => {
    const assignment = await Assignment.create({
      title: 'Grading test',
      description: 'Grade me.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 80,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const submission = await Submission.create({
      content: 'Please review',
      submittedAt: new Date().toISOString(),
      assignmentId: assignment.id,
      studentId: student.id,
    });

    const token = createToken(teacher);
    const res = await request(app)
      .put(`/api/submissions/${submission.id}/grade`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        score: 72,
        feedback: 'Strong work with one calculation error.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.submission.status).toBe('graded');

    await submission.reload();
    expect(submission.score).toBe(72);
    expect(submission.feedback).toBe('Strong work with one calculation error.');
  });

  test('grading sends notification to student', async () => {
    const assignment = await Assignment.create({
      title: 'Notification test',
      description: 'You will get a grade notification.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 25,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const submission = await Submission.create({
      content: 'Submitted',
      submittedAt: new Date().toISOString(),
      assignmentId: assignment.id,
      studentId: student.id,
    });

    const token = createToken(teacher);
    await request(app)
      .put(`/api/submissions/${submission.id}/grade`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        score: 21,
        feedback: 'Nice effort.',
      });

    const notification = await Notification.findOne({
      where: {
        userId: student.id,
        type: 'grade',
      },
    });

    expect(notification).not.toBeNull();
    expect(notification.message).toContain('21/25');
  });

  test('score cannot exceed maxScore (400)', async () => {
    const assignment = await Assignment.create({
      title: 'Score validation',
      description: 'Score must be capped.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 10,
      courseId: course.id,
      teacherId: teacher.id,
    });

    const submission = await Submission.create({
      content: 'Submitted',
      submittedAt: new Date().toISOString(),
      assignmentId: assignment.id,
      studentId: student.id,
    });

    const token = createToken(teacher);
    const res = await request(app)
      .put(`/api/submissions/${submission.id}/grade`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        score: 12,
        feedback: 'Too high',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Score cannot exceed');
  });
});

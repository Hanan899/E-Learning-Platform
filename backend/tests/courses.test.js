const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Material,
  Section,
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

describe('Course and Content Management', () => {
  let admin;
  let teacher;
  let otherTeacher;
  let student;
  let course;
  let draftCourse;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await LessonProgress.destroy({ where: {}, truncate: true, cascade: true });
    await Material.destroy({ where: {}, truncate: true, cascade: true });
    await Lesson.destroy({ where: {}, truncate: true, cascade: true });
    await Section.destroy({ where: {}, truncate: true, cascade: true });
    await Enrollment.destroy({ where: {}, truncate: true, cascade: true });
    await Course.destroy({ where: {}, truncate: true, cascade: true });
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
      firstName: 'Grace',
      lastName: 'Teacher',
      email: 'teacher@school.com',
      password: 'Teacher1234',
      role: 'teacher',
      createdAt: now,
      updatedAt: now,
    });
    otherTeacher = await User.create({
      firstName: 'Other',
      lastName: 'Teacher',
      email: 'other.teacher@school.com',
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

    course = await Course.create({
      title: 'Mathematics 101',
      description: 'A published math course for enrolled students.',
      category: 'Math',
      teacherId: teacher.id,
      isPublished: true,
    });

    draftCourse = await Course.create({
      title: 'Private Science',
      description: 'An unpublished science course.',
      category: 'Science',
      teacherId: otherTeacher.id,
      isPublished: false,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Course CRUD', () => {
    test('teacher can create a course', async () => {
      const token = createToken(teacher);
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'History Foundations')
        .field('description', 'A detailed history course for modern classrooms.')
        .field('category', 'History')
        .attach('thumbnail', Buffer.from('fake image'), {
          filename: 'thumbnail.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.course.title).toBe('History Foundations');
      expect(res.body.data.course.teacherId).toBe(teacher.id);
    });

    test("teacher cannot edit another teacher's course (403)", async () => {
      const token = createToken(teacher);
      const res = await request(app)
        .put(`/api/courses/${draftCourse.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Edited title' });

      expect(res.status).toBe(403);
    });

    test('published course is visible to students', async () => {
      const token = createToken(student);
      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.courses.some((entry) => entry.id === course.id)).toBe(true);
    });

    test('unpublished course is hidden from students', async () => {
      const token = createToken(student);
      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.courses.some((entry) => entry.id === draftCourse.id)).toBe(false);
    });
  });

  describe('Enrollment', () => {
    test('student can enroll in a published course', async () => {
      const token = createToken(student);
      const res = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(await Enrollment.count()).toBe(1);
    });

    test('student cannot enroll twice (400)', async () => {
      await Enrollment.create({
        studentId: student.id,
        courseId: course.id,
        enrolledAt: new Date(),
      });

      const token = createToken(student);
      const res = await request(app)
        .post(`/api/courses/${course.id}/enroll`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Already enrolled');
    });

    test('marking lesson complete updates progress percentage', async () => {
      const section = await Section.create({
        title: 'Intro',
        order: 1,
        courseId: course.id,
      });

      const [lessonOne, lessonTwo] = await Promise.all([
        Lesson.create({
          title: 'Lesson One',
          content: 'Body',
          order: 1,
          sectionId: section.id,
          courseId: course.id,
        }),
        Lesson.create({
          title: 'Lesson Two',
          content: 'Body',
          order: 2,
          sectionId: section.id,
          courseId: course.id,
        }),
      ]);

      await Enrollment.create({
        studentId: student.id,
        courseId: course.id,
        enrolledAt: new Date(),
      });

      const token = createToken(student);
      const res = await request(app)
        .post(`/api/lessons/${lessonOne.id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completionPercentage).toBe(50);

      const enrollment = await Enrollment.findOne({
        where: { studentId: student.id, courseId: course.id },
      });
      expect(enrollment.completionPercentage).toBe(50);
      expect(lessonTwo.id).toBeTruthy();
    });
  });

  describe('Content', () => {
    test('creating a section requires course ownership', async () => {
      const token = createToken(otherTeacher);
      const res = await request(app)
        .post(`/api/courses/${course.id}/sections`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Blocked', order: 1 });

      expect(res.status).toBe(403);
    });

    test('material upload saves file and record', async () => {
      const section = await Section.create({
        title: 'Uploads',
        order: 1,
        courseId: course.id,
      });
      const lesson = await Lesson.create({
        title: 'Lesson',
        content: 'Material test',
        order: 1,
        sectionId: section.id,
        courseId: course.id,
      });

      const token = createToken(teacher);
      const res = await request(app)
        .post(`/api/lessons/${lesson.id}/materials`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('pdf content'), {
          filename: 'lesson-notes.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.material.type).toBe('pdf');

      const material = await Material.findByPk(res.body.data.material.id);
      expect(material).not.toBeNull();
      expect(fs.existsSync(material.filePath)).toBe(true);
    });

    test('deleting lesson removes it from section', async () => {
      const section = await Section.create({
        title: 'Outline',
        order: 1,
        courseId: course.id,
      });
      const lesson = await Lesson.create({
        title: 'Disposable lesson',
        content: 'Delete me',
        order: 1,
        sectionId: section.id,
        courseId: course.id,
      });

      const token = createToken(teacher);
      const res = await request(app)
        .delete(`/api/lessons/${lesson.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(await Lesson.count({ where: { sectionId: section.id } })).toBe(0);
    });
  });
});

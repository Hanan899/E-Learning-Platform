const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Assignment,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
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

describe('Progress Dashboards', () => {
  let teacher;
  let student;
  let secondStudent;
  let course;
  let section;
  let lessonOne;
  let lessonTwo;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await QuizAttempt.destroy({ where: {}, truncate: true, cascade: true });
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
      email: 'teacher-progress@school.com',
      password: 'Teacher1234',
      role: 'teacher',
    });

    student = await User.create({
      firstName: 'Amina',
      lastName: 'Student',
      email: 'student-progress@school.com',
      password: 'Student1234',
      role: 'student',
    });

    secondStudent = await User.create({
      firstName: 'Bilal',
      lastName: 'Student',
      email: 'student-progress-2@school.com',
      password: 'Student1234',
      role: 'student',
    });

    course = await Course.create({
      title: 'Science Lab',
      description: 'Experiments and observation skills.',
      category: 'Science',
      teacherId: teacher.id,
      isPublished: true,
    });

    section = await Section.create({
      title: 'Week 1',
      order: 1,
      courseId: course.id,
    });

    lessonOne = await Lesson.create({
      title: 'Safety Intro',
      content: 'Wear goggles.',
      order: 1,
      sectionId: section.id,
      courseId: course.id,
    });

    lessonTwo = await Lesson.create({
      title: 'Measurement Basics',
      content: 'Use rulers well.',
      order: 2,
      sectionId: section.id,
      courseId: course.id,
    });

    await Enrollment.bulkCreate([
      {
        studentId: student.id,
        courseId: course.id,
        enrolledAt: new Date().toISOString(),
        completionPercentage: 50,
      },
      {
        studentId: secondStudent.id,
        courseId: course.id,
        enrolledAt: new Date().toISOString(),
        completionPercentage: 0,
      },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Student Dashboard', () => {
    test('returns enrolled courses with progress %', async () => {
      const token = createToken(student);
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.enrolledCourses).toHaveLength(1);
      expect(res.body.data.enrolledCourses[0].completionPercentage).toBe(50);
      expect(res.body.data.enrolledCourses[0].course.title).toBe('Science Lab');
    });

    test('upcoming deadlines only include unsubmitted future assignments', async () => {
      const futurePending = await Assignment.create({
        title: 'Lab Report',
        description: 'Complete the observation sheet.',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        maxScore: 100,
        courseId: course.id,
        teacherId: teacher.id,
      });

      const futureSubmitted = await Assignment.create({
        title: 'Safety Quiz Reflection',
        description: 'Submit your reflection notes.',
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        maxScore: 50,
        courseId: course.id,
        teacherId: teacher.id,
      });

      await Assignment.create({
        title: 'Expired Task',
        description: 'Past deadline.',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        maxScore: 50,
        courseId: course.id,
        teacherId: teacher.id,
      });

      await Submission.create({
        content: 'Already submitted',
        submittedAt: new Date().toISOString(),
        assignmentId: futureSubmitted.id,
        studentId: student.id,
      });

      const token = createToken(student);
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.upcomingDeadlines).toHaveLength(1);
      expect(res.body.data.upcomingDeadlines[0].assignment).toBe(futurePending.title);
    });

    test('weekly activity reflects actual lesson completions', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await LessonProgress.bulkCreate([
        {
          studentId: student.id,
          courseId: course.id,
          lessonId: lessonOne.id,
          completedAt: today.toISOString(),
        },
        {
          studentId: student.id,
          courseId: course.id,
          lessonId: lessonTwo.id,
          completedAt: yesterday.toISOString(),
        },
      ]);

      const token = createToken(student);
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.weeklyActivity).toHaveLength(7);
      const totalCompleted = res.body.data.weeklyActivity.reduce(
        (sum, day) => sum + day.lessonsCompleted,
        0
      );
      expect(totalCompleted).toBe(2);
      expect(res.body.data.overallProgress.completed).toBe(2);
    });
  });

  describe('Teacher Dashboard', () => {
    test('pending grading shows only ungraded submissions', async () => {
      const assignment = await Assignment.create({
        title: 'Microscope Notes',
        description: 'Write your findings.',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        maxScore: 40,
        courseId: course.id,
        teacherId: teacher.id,
      });

      await Submission.bulkCreate([
        {
          content: 'Ready for review',
          submittedAt: new Date().toISOString(),
          assignmentId: assignment.id,
          studentId: student.id,
          status: 'submitted',
        },
        {
          content: 'Already graded',
          submittedAt: new Date().toISOString(),
          assignmentId: assignment.id,
          studentId: secondStudent.id,
          status: 'graded',
          score: 36,
        },
      ]);

      const token = createToken(teacher);
      const res = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pendingGrading).toHaveLength(1);
      expect(res.body.data.pendingGrading[0].student.fullName).toBe('Amina Student');
    });

    test('course stats include correct enrolled count', async () => {
      const token = createToken(teacher);
      const res = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.courseStats).toHaveLength(1);
      expect(res.body.data.courseStats[0].enrolledCount).toBe(2);
      expect(res.body.data.totalStats.totalStudents).toBe(2);
    });
  });
});

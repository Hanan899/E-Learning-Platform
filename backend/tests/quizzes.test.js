const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const {
  Course,
  Enrollment,
  Notification,
  Question,
  Quiz,
  QuizAttempt,
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

describe('Quiz System', () => {
  let teacher;
  let student;
  let secondStudent;
  let course;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Notification.destroy({ where: {}, truncate: true, cascade: true });
    await QuizAttempt.destroy({ where: {}, truncate: true, cascade: true });
    await Question.destroy({ where: {}, truncate: true, cascade: true });
    await Quiz.destroy({ where: {}, truncate: true, cascade: true });
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
      title: 'Biology',
      description: 'Core biology course',
      category: 'Science',
      teacherId: teacher.id,
      isPublished: true,
    });

    await Enrollment.bulkCreate([
      { studentId: student.id, courseId: course.id, enrolledAt: new Date().toISOString() },
      { studentId: secondStudent.id, courseId: course.id, enrolledAt: new Date().toISOString() },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const createQuizWithQuestions = async () => {
    const quiz = await Quiz.create({
      title: 'Chapter 1 Quiz',
      timeLimit: 15,
      courseId: course.id,
    });

    const questions = await Question.bulkCreate([
      {
        text: 'What is the powerhouse of the cell?',
        options: [
          { id: 'a', text: 'Nucleus' },
          { id: 'b', text: 'Mitochondria' },
          { id: 'c', text: 'Ribosome' },
          { id: 'd', text: 'Membrane' },
        ],
        correctOption: 'b',
        points: 5,
        order: 1,
        quizId: quiz.id,
      },
      {
        text: 'Which organelle contains DNA?',
        options: [
          { id: 'a', text: 'Nucleus' },
          { id: 'b', text: 'Golgi body' },
          { id: 'c', text: 'Lysosome' },
          { id: 'd', text: 'Vacuole' },
        ],
        correctOption: 'a',
        points: 5,
        order: 2,
        quizId: quiz.id,
      },
    ]);

    return { quiz, questions };
  };

  describe('Quiz Creation', () => {
    test('teacher can create quiz with questions', async () => {
      const token = createToken(teacher);
      const quizRes = await request(app)
        .post(`/api/courses/${course.id}/quizzes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Chapter Check', timeLimit: 10 });

      expect(quizRes.status).toBe(201);

      const questionRes = await request(app)
        .post(`/api/quizzes/${quizRes.body.data.quiz.id}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Question text',
          options: [
            { id: 'a', text: 'One' },
            { id: 'b', text: 'Two' },
            { id: 'c', text: 'Three' },
            { id: 'd', text: 'Four' },
          ],
          correctOption: 'a',
          points: 3,
        });

      expect(questionRes.status).toBe(201);
      expect(await Question.count()).toBe(1);
    });

    test('question requires exactly 4 options', async () => {
      const { quiz } = await createQuizWithQuestions();
      const token = createToken(teacher);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Broken question',
          options: [
            { id: 'a', text: 'One' },
            { id: 'b', text: 'Two' },
          ],
          correctOption: 'a',
          points: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exactly 4 options');
    });

    test('correctOption must match one of the option ids', async () => {
      const { quiz } = await createQuizWithQuestions();
      const token = createToken(teacher);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Broken question',
          options: [
            { id: 'a', text: 'One' },
            { id: 'b', text: 'Two' },
            { id: 'c', text: 'Three' },
            { id: 'd', text: 'Four' },
          ],
          correctOption: 'z',
          points: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('correctOption');
    });
  });

  describe('Quiz Attempt', () => {
    test('student can submit attempt and receives auto-graded score', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      const token = createToken(student);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempt`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: {
            [questions[0].id]: 'b',
            [questions[1].id]: 'd',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attempt.score).toBe(50);
      expect(res.body.data.attempt.breakdown).toHaveLength(2);
    });

    test('student cannot attempt quiz twice (400)', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      await QuizAttempt.create({
        studentId: student.id,
        quizId: quiz.id,
        answers: { [questions[0].id]: 'b' },
        score: 50,
        completedAt: new Date().toISOString(),
      });

      const token = createToken(student);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempt`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: { [questions[0].id]: 'b' } });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already attempted');
    });

    test('correct answers are not returned to student before attempt', async () => {
      const { quiz } = await createQuizWithQuestions();
      const token = createToken(student);
      const res = await request(app)
        .get(`/api/quizzes/${quiz.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quiz.questions[0]).not.toHaveProperty('correctOption');
    });

    test('all correct answers gives 100% score', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      const token = createToken(student);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempt`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: {
            [questions[0].id]: 'b',
            [questions[1].id]: 'a',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attempt.score).toBe(100);
    });

    test('all wrong answers gives 0% score', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      const token = createToken(student);
      const res = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempt`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: {
            [questions[0].id]: 'a',
            [questions[1].id]: 'd',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attempt.score).toBe(0);
    });
  });

  describe('Quiz Results', () => {
    test('teacher can view all attempts with scores', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      await QuizAttempt.bulkCreate([
        {
          studentId: student.id,
          quizId: quiz.id,
          answers: { [questions[0].id]: 'b', [questions[1].id]: 'a' },
          score: 100,
          completedAt: new Date().toISOString(),
        },
        {
          studentId: secondStudent.id,
          quizId: quiz.id,
          answers: { [questions[0].id]: 'a', [questions[1].id]: 'a' },
          score: 50,
          completedAt: new Date().toISOString(),
        },
      ]);

      const token = createToken(teacher);
      const res = await request(app)
        .get(`/api/quizzes/${quiz.id}/results`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attempts).toHaveLength(2);
      expect(res.body.data.stats.averageScore).toBe(75);
    });

    test('results include correct/incorrect breakdown', async () => {
      const { quiz, questions } = await createQuizWithQuestions();
      await QuizAttempt.create({
        studentId: student.id,
        quizId: quiz.id,
        answers: { [questions[0].id]: 'b', [questions[1].id]: 'd' },
        score: 50,
        completedAt: new Date().toISOString(),
      });

      const token = createToken(teacher);
      const res = await request(app)
        .get(`/api/quizzes/${quiz.id}/results`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attempts[0].breakdown[0].isCorrect).toBe(true);
      expect(res.body.data.attempts[0].breakdown[1].isCorrect).toBe(false);
    });
  });
});

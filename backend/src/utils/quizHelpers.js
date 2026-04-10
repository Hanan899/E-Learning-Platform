const { Course, Enrollment, Question, Quiz, QuizAttempt, User } = require('../models');

const serializeQuestion = (question, options = {}) => {
  if (!question) {
    return null;
  }

  const includeCorrectOption = options.includeCorrectOption ?? false;

  return {
    id: question.id,
    text: question.text,
    options: question.options,
    points: question.points,
    order: question.order,
    quizId: question.quizId,
    ...(includeCorrectOption ? { correctOption: question.correctOption } : {}),
  };
};

const serializeQuiz = (quiz, options = {}) => ({
  id: quiz.id,
  title: quiz.title,
  timeLimit: quiz.timeLimit,
  courseId: quiz.courseId,
  course: quiz.course
    ? {
        id: quiz.course.id,
        title: quiz.course.title,
        category: quiz.course.category,
      }
    : null,
  questions: (quiz.questions || [])
    .slice()
    .sort((first, second) => (first.order || 0) - (second.order || 0))
    .map((question) => serializeQuestion(question, options)),
});

const buildAttemptBreakdown = (questions, answers = {}) => {
  const normalizedQuestions = questions.slice().sort((first, second) => (first.order || 0) - (second.order || 0));
  const totalPoints = normalizedQuestions.reduce((sum, question) => sum + Number(question.points || 0), 0);

  let earnedPoints = 0;
  let correctCount = 0;

  const breakdown = normalizedQuestions.map((question) => {
    const selectedOption = answers[question.id] || null;
    const isCorrect = selectedOption === question.correctOption;

    if (isCorrect) {
      earnedPoints += Number(question.points || 0);
      correctCount += 1;
    }

    return {
      questionId: question.id,
      text: question.text,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      points: question.points,
      options: question.options,
    };
  });

  const score = totalPoints ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;

  return {
    score,
    totalPoints,
    earnedPoints,
    correctCount,
    questionCount: normalizedQuestions.length,
    breakdown,
  };
};

const serializeAttempt = (attempt, quiz, questions) => {
  if (!attempt) {
    return null;
  }

  const summary = buildAttemptBreakdown(questions, attempt.answers || {});

  return {
    id: attempt.id,
    studentId: attempt.studentId,
    quizId: attempt.quizId,
    answers: attempt.answers,
    score: attempt.score,
    completedAt: attempt.completedAt,
    totalPoints: summary.totalPoints,
    earnedPoints: summary.earnedPoints,
    correctCount: summary.correctCount,
    questionCount: summary.questionCount,
    breakdown: summary.breakdown,
    quiz: quiz
      ? {
          id: quiz.id,
          title: quiz.title,
          courseId: quiz.courseId,
        }
      : null,
    student: attempt.student
      ? {
          id: attempt.student.id,
          firstName: attempt.student.firstName,
          lastName: attempt.student.lastName,
          email: attempt.student.email,
        }
      : null,
  };
};

const ensureQuizOwnership = async (quizId, user) => {
  const quiz = await Quiz.findByPk(quizId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!quiz) {
    return { error: { statusCode: 404, message: 'Quiz not found' } };
  }

  if (user.role !== 'teacher' || quiz.course.teacherId !== user.id) {
    return { error: { statusCode: 403, message: 'You do not have access to this quiz' } };
  }

  return { quiz, course: quiz.course };
};

const ensureQuestionOwnership = async (questionId, user) => {
  const question = await Question.findByPk(questionId, {
    include: [
      {
        model: Quiz,
        as: 'quiz',
        include: [{ model: Course, as: 'course' }],
      },
    ],
  });

  if (!question) {
    return { error: { statusCode: 404, message: 'Question not found' } };
  }

  if (user.role !== 'teacher' || question.quiz.course.teacherId !== user.id) {
    return { error: { statusCode: 403, message: 'You do not have access to this question' } };
  }

  return { question, quiz: question.quiz, course: question.quiz.course };
};

const ensureQuizAccess = async (quizId, user) => {
  const quiz = await Quiz.findByPk(quizId, {
    include: [
      { model: Course, as: 'course' },
      { model: Question, as: 'questions' },
    ],
  });

  if (!quiz) {
    return { error: { statusCode: 404, message: 'Quiz not found' } };
  }

  if (user.role === 'teacher') {
    if (quiz.course.teacherId !== user.id) {
      return { error: { statusCode: 403, message: 'You do not have access to this quiz' } };
    }

    return { quiz, course: quiz.course, questions: quiz.questions || [] };
  }

  if (user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      where: { studentId: user.id, courseId: quiz.courseId },
    });

    if (!enrollment) {
      return { error: { statusCode: 403, message: 'You must be enrolled in this course first' } };
    }

    const attempt = await QuizAttempt.findOne({
      where: { studentId: user.id, quizId },
    });

    return { quiz, course: quiz.course, questions: quiz.questions || [], enrollment, attempt };
  }

  return { error: { statusCode: 403, message: 'You do not have access to this quiz' } };
};

const buildScoreDistribution = (attempts) => {
  const buckets = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '20-40', min: 20, max: 40, count: 0 },
    { range: '40-60', min: 40, max: 60, count: 0 },
    { range: '60-80', min: 60, max: 80, count: 0 },
    { range: '80-100', min: 80, max: 101, count: 0 },
  ];

  attempts.forEach((attempt) => {
    const bucket = buckets.find((entry) => attempt.score >= entry.min && attempt.score < entry.max);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets.map(({ range, count }) => ({ range, count }));
};

module.exports = {
  buildAttemptBreakdown,
  buildScoreDistribution,
  ensureQuizAccess,
  ensureQuizOwnership,
  ensureQuestionOwnership,
  serializeAttempt,
  serializeQuestion,
  serializeQuiz,
};

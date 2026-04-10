const {
  Course,
  Notification,
  Question,
  Quiz,
  QuizAttempt,
  User,
} = require('../models');
const { error, success } = require('../utils/responseHelper');
const { ensureCourseOwnership } = require('../utils/courseHelpers');
const {
  buildAttemptBreakdown,
  buildScoreDistribution,
  ensureQuestionOwnership,
  ensureQuizAccess,
  ensureQuizOwnership,
  serializeAttempt,
  serializeQuiz,
} = require('../utils/quizHelpers');

const normalizeOptions = (options = []) =>
  options.map((option) => ({
    id: String(option.id || '').trim(),
    text: String(option.text || '').trim(),
  }));

const validateQuestionPayload = ({ options, correctOption, points }) => {
  const normalizedOptions = normalizeOptions(options);

  if (normalizedOptions.length !== 4) {
    return { message: 'Questions require exactly 4 options' };
  }

  const optionIds = normalizedOptions.map((option) => option.id);
  const uniqueIds = new Set(optionIds);

  if (
    normalizedOptions.some((option) => !option.id || !option.text) ||
    uniqueIds.size !== 4 ||
    !optionIds.includes(correctOption)
  ) {
    return { message: 'correctOption must match one of the option ids' };
  }

  if (Number(points) < 1 || Number(points) > 10) {
    return { message: 'Points must be between 1 and 10' };
  }

  return { options: normalizedOptions };
};

const createQuiz = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const quiz = await Quiz.create({
      title: req.body.title.trim(),
      timeLimit: req.body.timeLimit ? Number(req.body.timeLimit) : null,
      courseId: req.params.courseId,
    });

    const createdQuiz = await Quiz.findByPk(quiz.id, {
      include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'category'] }],
    });

    return success(res, { quiz: serializeQuiz(createdQuiz) }, 'Quiz created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateQuiz = async (req, res, next) => {
  try {
    const ownership = await ensureQuizOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    await ownership.quiz.update({
      title: typeof req.body.title === 'string' ? req.body.title.trim() : ownership.quiz.title,
      timeLimit:
        Object.prototype.hasOwnProperty.call(req.body, 'timeLimit')
          ? req.body.timeLimit
            ? Number(req.body.timeLimit)
            : null
          : ownership.quiz.timeLimit,
    });

    const updatedQuiz = await Quiz.findByPk(ownership.quiz.id, {
      include: [
        { model: Course, as: 'course', attributes: ['id', 'title', 'category'] },
        { model: Question, as: 'questions' },
      ],
    });

    return success(res, { quiz: serializeQuiz(updatedQuiz, { includeCorrectOption: true }) }, 'Quiz updated successfully');
  } catch (err) {
    return next(err);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const ownership = await ensureQuizOwnership(req.params.quizId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const validation = validateQuestionPayload(req.body);
    if (validation.message) {
      return error(res, validation.message, 400);
    }

    const questionCount = await Question.count({ where: { quizId: req.params.quizId } });
    const question = await Question.create({
      text: req.body.text.trim(),
      options: validation.options,
      correctOption: req.body.correctOption,
      points: Number(req.body.points),
      order: Object.prototype.hasOwnProperty.call(req.body, 'order') ? Number(req.body.order) : questionCount + 1,
      quizId: req.params.quizId,
    });

    return success(
      res,
      { question: { ...question.get(), options: validation.options } },
      'Question added successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const ownership = await ensureQuestionOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const nextOptions = Object.prototype.hasOwnProperty.call(req.body, 'options')
      ? req.body.options
      : ownership.question.options;
    const nextCorrectOption = Object.prototype.hasOwnProperty.call(req.body, 'correctOption')
      ? req.body.correctOption
      : ownership.question.correctOption;
    const nextPoints = Object.prototype.hasOwnProperty.call(req.body, 'points')
      ? Number(req.body.points)
      : ownership.question.points;

    const validation = validateQuestionPayload({
      options: nextOptions,
      correctOption: nextCorrectOption,
      points: nextPoints,
    });
    if (validation.message) {
      return error(res, validation.message, 400);
    }

    await ownership.question.update({
      text: typeof req.body.text === 'string' ? req.body.text.trim() : ownership.question.text,
      options: validation.options,
      correctOption: nextCorrectOption,
      points: nextPoints,
      order: Object.prototype.hasOwnProperty.call(req.body, 'order')
        ? Number(req.body.order)
        : ownership.question.order,
    });

    return success(
      res,
      { question: ownership.question.get() },
      'Question updated successfully'
    );
  } catch (err) {
    return next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const ownership = await ensureQuestionOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    await ownership.question.destroy();
    return success(res, null, 'Question deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const getQuiz = async (req, res, next) => {
  try {
    const access = await ensureQuizAccess(req.params.id, req.user);
    if (access.error) {
      return error(res, access.error.message, access.error.statusCode);
    }

    const includeCorrectOption = req.user.role === 'teacher';
    const quizPayload = serializeQuiz(access.quiz, { includeCorrectOption });
    const attemptResult =
      req.user.role === 'student' && access.attempt
        ? serializeAttempt(access.attempt, access.quiz, access.questions)
        : null;

    return success(res, {
      quiz: quizPayload,
      attemptResult,
    });
  } catch (err) {
    return next(err);
  }
};

const submitQuizAttempt = async (req, res, next) => {
  try {
    const access = await ensureQuizAccess(req.params.id, req.user);
    if (access.error) {
      return error(res, access.error.message, access.error.statusCode);
    }

    if (req.user.role !== 'student') {
      return error(res, 'Only students can attempt quizzes', 403);
    }

    if (access.attempt) {
      return error(
        res,
        'Quiz already attempted',
        400,
        serializeAttempt(access.attempt, access.quiz, access.questions)
      );
    }

    const answers = req.body.answers || {};
    const result = buildAttemptBreakdown(access.questions, answers);

    const attempt = await QuizAttempt.create({
      studentId: req.user.id,
      quizId: access.quiz.id,
      answers,
      score: result.score,
      completedAt: new Date().toISOString(),
    });

    await Notification.create({
      userId: req.user.id,
      title: 'Quiz completed',
      message: `Quiz ${access.quiz.title} completed! Score: ${result.score}%`,
      type: 'announcement',
      createdAt: new Date().toISOString(),
    });

    return success(
      res,
      {
        attempt: serializeAttempt(attempt, access.quiz, access.questions),
        total: result.totalPoints,
        correctCount: result.correctCount,
      },
      'Quiz submitted successfully',
      201
    );
  } catch (err) {
    return next(err);
  }
};

const getQuizResults = async (req, res, next) => {
  try {
    const ownership = await ensureQuizOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const quiz = await Quiz.findByPk(req.params.id, {
      include: [
        { model: Course, as: 'course', attributes: ['id', 'title', 'category'] },
        { model: Question, as: 'questions' },
        {
          model: QuizAttempt,
          as: 'attempts',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
        },
      ],
    });

    const attempts = (quiz.attempts || []).map((attempt) => serializeAttempt(attempt, quiz, quiz.questions || []));
    const averageScore = attempts.length
      ? Number((attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / attempts.length).toFixed(2))
      : 0;
    const passRate = attempts.length
      ? Number(((attempts.filter((attempt) => attempt.score >= 60).length / attempts.length) * 100).toFixed(2))
      : 0;

    return success(res, {
      quiz: serializeQuiz(quiz, { includeCorrectOption: true }),
      attempts,
      stats: {
        totalAttempts: attempts.length,
        averageScore,
        passRate,
        scoreDistribution: buildScoreDistribution(attempts),
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getMyQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'category'] }],
        },
      ],
      order: [['completedAt', 'DESC']],
    });

    return success(res, {
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        score: attempt.score,
        completedAt: attempt.completedAt,
        quiz: attempt.quiz
          ? {
              id: attempt.quiz.id,
              title: attempt.quiz.title,
              courseId: attempt.quiz.courseId,
              course: attempt.quiz.course
                ? {
                    id: attempt.quiz.course.id,
                    title: attempt.quiz.course.title,
                    category: attempt.quiz.course.category,
                  }
                : null,
            }
          : null,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuiz,
  submitQuizAttempt,
  getQuizResults,
  getMyQuizAttempts,
};

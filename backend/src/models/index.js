const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MODELS_CACHE_KEY = Symbol.for('elearning.models');

const defineModels = (targetSequelize) => ({
  sequelize: targetSequelize,
  User: require('./User')(targetSequelize, DataTypes),
  Course: require('./Course')(targetSequelize, DataTypes),
  Section: require('./Section')(targetSequelize, DataTypes),
  Lesson: require('./Lesson')(targetSequelize, DataTypes),
  Material: require('./Material')(targetSequelize, DataTypes),
  Enrollment: require('./Enrollment')(targetSequelize, DataTypes),
  Assignment: require('./Assignment')(targetSequelize, DataTypes),
  Submission: require('./Submission')(targetSequelize, DataTypes),
  Quiz: require('./Quiz')(targetSequelize, DataTypes),
  Question: require('./Question')(targetSequelize, DataTypes),
  QuizAttempt: require('./QuizAttempt')(targetSequelize, DataTypes),
  Notification: require('./Notification')(targetSequelize, DataTypes),
  LessonProgress: require('./LessonProgress')(targetSequelize, DataTypes),
});

const associateModels = (models) => {
  const {
    User,
    Course,
    Section,
    Lesson,
    Material,
    Enrollment,
    Assignment,
    Submission,
    Quiz,
    Question,
    QuizAttempt,
    Notification,
    LessonProgress,
  } = models;

  User.hasMany(Course, { foreignKey: 'teacherId', as: 'teachingCourses' });
  Course.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

  Course.hasMany(Section, { foreignKey: 'courseId', as: 'sections', onDelete: 'CASCADE' });
  Section.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  Course.hasMany(Lesson, { foreignKey: 'courseId', as: 'lessons', onDelete: 'CASCADE' });
  Lesson.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  Section.hasMany(Lesson, { foreignKey: 'sectionId', as: 'lessons', onDelete: 'CASCADE' });
  Lesson.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

  Course.hasMany(Material, { foreignKey: 'courseId', as: 'materials', onDelete: 'CASCADE' });
  Material.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  Lesson.hasMany(Material, { foreignKey: 'lessonId', as: 'materials', onDelete: 'CASCADE' });
  Material.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

  Course.hasMany(Assignment, { foreignKey: 'courseId', as: 'assignments', onDelete: 'CASCADE' });
  Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
  User.hasMany(Assignment, { foreignKey: 'teacherId', as: 'createdAssignments' });
  Assignment.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

  Assignment.hasMany(Submission, {
    foreignKey: 'assignmentId',
    as: 'submissions',
    onDelete: 'CASCADE',
  });
  Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });
  User.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
  Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

  Course.hasMany(Quiz, { foreignKey: 'courseId', as: 'quizzes', onDelete: 'CASCADE' });
  Quiz.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  Quiz.hasMany(Question, { foreignKey: 'quizId', as: 'questions', onDelete: 'CASCADE' });
  Question.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });

  Quiz.hasMany(QuizAttempt, {
    foreignKey: 'quizId',
    as: 'attempts',
    onDelete: 'CASCADE',
  });
  QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });
  User.hasMany(QuizAttempt, { foreignKey: 'studentId', as: 'quizAttempts' });
  QuizAttempt.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments' });
  Enrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
  Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments' });
  Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  User.hasMany(LessonProgress, { foreignKey: 'studentId', as: 'lessonProgress' });
  LessonProgress.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
  Lesson.hasMany(LessonProgress, { foreignKey: 'lessonId', as: 'progressEntries' });
  LessonProgress.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
  Course.hasMany(LessonProgress, { foreignKey: 'courseId', as: 'progressEntries' });
  LessonProgress.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

  return models;
};

const initializeModels = (targetSequelize = sequelize) => {
  if (!targetSequelize[MODELS_CACHE_KEY]) {
    const models = associateModels(defineModels(targetSequelize));
    Object.defineProperty(targetSequelize, MODELS_CACHE_KEY, {
      value: models,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return targetSequelize[MODELS_CACHE_KEY];
};

const models = initializeModels(sequelize);

module.exports = {
  initializeModels,
  associateModels,
  ...models,
};

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./User')(sequelize, DataTypes);
const Course = require('./Course')(sequelize, DataTypes);
const Section = require('./Section')(sequelize, DataTypes);
const Lesson = require('./Lesson')(sequelize, DataTypes);
const Material = require('./Material')(sequelize, DataTypes);
const Enrollment = require('./Enrollment')(sequelize, DataTypes);
const Assignment = require('./Assignment')(sequelize, DataTypes);
const Submission = require('./Submission')(sequelize, DataTypes);
const Quiz = require('./Quiz')(sequelize, DataTypes);
const Question = require('./Question')(sequelize, DataTypes);
const QuizAttempt = require('./QuizAttempt')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const LessonProgress = require('./LessonProgress')(sequelize, DataTypes);

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

module.exports = {
  sequelize,
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
};

const {
  sequelize,
  User,
  Course,
  Section,
  Lesson,
  Enrollment,
} = require('../models');

const seedDatabase = async () => {
  await sequelize.sync({ force: true });
  const now = new Date();

  const admin = await User.create({
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@school.com',
    password: 'Admin123!',
    role: 'admin',
  });

  const teacher = await User.create({
    firstName: 'Grace',
    lastName: 'Teacher',
    email: 'teacher@school.com',
    password: 'Teacher123!',
    role: 'teacher',
  });

  const studentOne = await User.create({
    firstName: 'Amina',
    lastName: 'Student',
    email: 'student1@school.com',
    password: 'Student123!',
    role: 'student',
  });

  const studentTwo = await User.create({
    firstName: 'Bilal',
    lastName: 'Student',
    email: 'student2@school.com',
    password: 'Student123!',
    role: 'student',
  });

  const courseOne = await Course.create({
    title: 'Introduction to Mathematics',
    description: 'Core arithmetic and problem-solving skills for middle school learners.',
    teacherId: teacher.id,
    isPublished: true,
    category: 'Mathematics',
  });

  const courseTwo = await Course.create({
    title: 'Foundations of Science',
    description: 'A practical introduction to scientific thinking and lab safety.',
    teacherId: teacher.id,
    isPublished: true,
    category: 'Science',
  });

  const mathSection = await Section.create({
    title: 'Numbers and Operations',
    order: 1,
    courseId: courseOne.id,
  });

  const scienceSection = await Section.create({
    title: 'Scientific Method',
    order: 1,
    courseId: courseTwo.id,
  });

  await Lesson.bulkCreate([
    {
      title: 'Whole Numbers',
      content: 'Learn how to identify and compare whole numbers.',
      order: 1,
      sectionId: mathSection.id,
      courseId: courseOne.id,
    },
    {
      title: 'Fractions Basics',
      content: 'Understand fractions, numerators, and denominators.',
      order: 2,
      sectionId: mathSection.id,
      courseId: courseOne.id,
    },
    {
      title: 'Observation and Hypothesis',
      content: 'Build scientific questions from everyday observations.',
      order: 1,
      sectionId: scienceSection.id,
      courseId: courseTwo.id,
    },
    {
      title: 'Planning an Experiment',
      content: 'Learn how to design simple classroom experiments.',
      order: 2,
      sectionId: scienceSection.id,
      courseId: courseTwo.id,
    },
  ]);

  await Enrollment.bulkCreate([
    {
      studentId: studentOne.id,
      courseId: courseOne.id,
      enrolledAt: now,
      completionPercentage: 0,
    },
    {
      studentId: studentTwo.id,
      courseId: courseOne.id,
      enrolledAt: now,
      completionPercentage: 0,
    },
  ]);

  return {
    admin,
    teacher,
    studentOne,
    studentTwo,
    courseOne,
    courseTwo,
  };
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeded successfully');
      return sequelize.close();
    })
    .catch((err) => {
      console.error('Failed to seed database:', err);
      process.exitCode = 1;
    });
}

module.exports = seedDatabase;

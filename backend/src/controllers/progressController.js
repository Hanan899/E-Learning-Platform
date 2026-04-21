const { Op } = require('sequelize');
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
} = require('../models');
const { error, success } = require('../utils/responseHelper');
const { ensureCourseOwnership } = require('../utils/courseHelpers');

const getFullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const round = (value) => Number(Number(value || 0).toFixed(2));

const getStudentDashboard = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'description', 'thumbnail', 'category', 'isPublished'],
          where: { isPublished: true },
          required: true,
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
      ],
      order: [['enrolledAt', 'DESC']],
    });

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    if (courseIds.length === 0) {
      return success(res, {
        enrolledCourses: [],
        recentGrades: [],
        upcomingDeadlines: [],
        quizStats: { attempted: 0, averageScore: 0 },
        overallProgress: { totalLessons: 0, completed: 0 },
        weeklyActivity: [],
        gradeStats: { averageScore: 0, gradedCount: 0 },
      });
    }

    const [
      lessons,
      lessonProgressEntries,
      studentSubmissions,
      quizAttempts,
      upcomingAssignments,
    ] = await Promise.all([
      Lesson.findAll({
        where: { courseId: { [Op.in]: courseIds } },
        attributes: ['id', 'courseId', 'title', 'order'],
        order: [['order', 'ASC']],
      }),
      LessonProgress.findAll({
        where: { studentId: req.user.id, courseId: { [Op.in]: courseIds } },
        attributes: ['id', 'courseId', 'lessonId', 'completedAt'],
      }),
      Submission.findAll({
        where: { studentId: req.user.id },
        include: [
          {
            model: Assignment,
            as: 'assignment',
            attributes: ['id', 'title', 'maxScore', 'courseId', 'dueDate'],
            include: [
              {
                model: Course,
                as: 'course',
                attributes: ['id', 'title'],
              },
            ],
          },
        ],
        order: [['submittedAt', 'DESC']],
      }),
      QuizAttempt.findAll({
        where: { studentId: req.user.id },
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['id', 'title', 'courseId'],
          },
        ],
        order: [['completedAt', 'DESC']],
      }),
      Assignment.findAll({
        where: {
          courseId: { [Op.in]: courseIds },
          dueDate: { [Op.gte]: new Date().toISOString() },
        },
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
          {
            model: Submission,
            as: 'submissions',
            attributes: ['id', 'studentId'],
            where: { studentId: req.user.id },
            required: false,
          },
        ],
        order: [['dueDate', 'ASC']],
      }),
    ]);

    const progressByCourseId = new Map();
    const activityByCourseId = new Map();
    const lessonsByCourseId = new Map();

    lessons.forEach((lesson) => {
      if (!lessonsByCourseId.has(lesson.courseId)) {
        lessonsByCourseId.set(lesson.courseId, []);
      }
      lessonsByCourseId.get(lesson.courseId).push(lesson);
    });

    lessonProgressEntries.forEach((entry) => {
      if (!progressByCourseId.has(entry.courseId)) {
        progressByCourseId.set(entry.courseId, []);
      }
      progressByCourseId.get(entry.courseId).push(entry);

      const completedAt = entry.completedAt ? new Date(entry.completedAt).toISOString() : null;
      if (completedAt) {
        const currentValue = activityByCourseId.get(entry.courseId);
        if (!currentValue || completedAt > currentValue) {
          activityByCourseId.set(entry.courseId, completedAt);
        }
      }
    });

    studentSubmissions.forEach((submission) => {
      const courseId = submission.assignment?.courseId;
      if (!courseId) {
        return;
      }

      const submittedAt = submission.submittedAt ? new Date(submission.submittedAt).toISOString() : null;
      if (!submittedAt) {
        return;
      }

      const currentValue = activityByCourseId.get(courseId);
      if (!currentValue || submittedAt > currentValue) {
        activityByCourseId.set(courseId, submittedAt);
      }
    });

    quizAttempts.forEach((attempt) => {
      const courseId = attempt.quiz?.courseId;
      if (!courseId || !attempt.completedAt) {
        return;
      }

      const completedAt = new Date(attempt.completedAt).toISOString();
      const currentValue = activityByCourseId.get(courseId);
      if (!currentValue || completedAt > currentValue) {
        activityByCourseId.set(courseId, completedAt);
      }
    });

    const submittedAssignmentIds = new Set(studentSubmissions.map((submission) => submission.assignmentId));

    const enrolledCourses = enrollments.map((enrollment) => ({
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.thumbnail,
        category: enrollment.course.category,
        isPublished: enrollment.course.isPublished,
        teacher: enrollment.course.teacher
          ? {
              id: enrollment.course.teacher.id,
              firstName: enrollment.course.teacher.firstName,
              lastName: enrollment.course.teacher.lastName,
              fullName: getFullName(enrollment.course.teacher),
            }
          : null,
        lessonCount: (lessonsByCourseId.get(enrollment.courseId) || []).length,
      },
      completionPercentage: enrollment.completionPercentage,
      lastActivity:
        activityByCourseId.get(enrollment.courseId) || new Date(enrollment.enrolledAt).toISOString(),
    }));

    const recentGrades = studentSubmissions
      .filter((submission) => submission.status === 'graded' && submission.assignment)
      .slice(0, 5)
      .map((submission) => ({
        assignment: {
          id: submission.assignment.id,
          title: submission.assignment.title,
          courseId: submission.assignment.courseId,
          courseTitle: submission.assignment.course?.title || 'Course',
        },
        score: submission.score,
        maxScore: submission.assignment.maxScore,
        gradedAt: submission.submittedAt,
      }));

    const upcomingDeadlines = upcomingAssignments
      .filter((assignment) => !submittedAssignmentIds.has(assignment.id))
      .map((assignment) => ({
        assignmentId: assignment.id,
        assignment: assignment.title,
        dueDate: assignment.dueDate,
        courseId: assignment.courseId,
        courseTitle: assignment.course?.title || 'Course',
        submitted: false,
      }))
      .sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate));

    const attemptedCount = quizAttempts.length;
    const averageQuizScore = attemptedCount
      ? round(
          quizAttempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) / attemptedCount
        )
      : 0;

    const gradedSubmissions = studentSubmissions.filter((submission) => submission.status === 'graded');
    const averageGradeScore = gradedSubmissions.length
      ? round(
          gradedSubmissions.reduce((total, submission) => {
            const maxScore = Number(submission.assignment?.maxScore || 0);
            if (!maxScore) {
              return total;
            }

            return total + (Number(submission.score || 0) / maxScore) * 100;
          }, 0) / gradedSubmissions.length
        )
      : 0;

    const weeklyActivityMap = new Map();
    lessonProgressEntries
      .filter((entry) => entry.completedAt)
      .forEach((entry) => {
        const key = toDateKey(entry.completedAt);
        if (!key) {
          return;
        }

        weeklyActivityMap.set(key, (weeklyActivityMap.get(key) || 0) + 1);
      });

    const currentUtcDate = new Date();
    const utcDayStart = new Date(
      Date.UTC(
        currentUtcDate.getUTCFullYear(),
        currentUtcDate.getUTCMonth(),
        currentUtcDate.getUTCDate()
      )
    );

    const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(utcDayStart);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        date: key,
        lessonsCompleted: weeklyActivityMap.get(key) || 0,
      };
    });

    return success(res, {
      enrolledCourses,
      recentGrades,
      upcomingDeadlines,
      quizStats: {
        attempted: attemptedCount,
        averageScore: averageQuizScore,
      },
      overallProgress: {
        totalLessons: lessons.length,
        completed: lessonProgressEntries.filter((entry) => entry.completedAt).length,
      },
      weeklyActivity,
      gradeStats: {
        averageScore: averageGradeScore,
        gradedCount: gradedSubmissions.length,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getTeacherDashboard = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      where: { teacherId: req.user.id },
      include: [
        {
          model: Enrollment,
          as: 'enrollments',
          attributes: ['id', 'studentId', 'completionPercentage', 'enrolledAt'],
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const courseIds = courses.map((course) => course.id);
    if (courseIds.length === 0) {
      return success(res, {
        courseStats: [],
        pendingGrading: [],
        recentActivity: [],
        totalStats: {
          totalStudents: 0,
          totalCourses: 0,
          avgCourseCompletion: 0,
        },
      });
    }

    const [assignments, quizzes, lessonActivities] = await Promise.all([
      Assignment.findAll({
        where: { courseId: { [Op.in]: courseIds } },
        attributes: ['id', 'title', 'courseId', 'maxScore'],
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
        ],
      }),
      Quiz.findAll({
        where: { courseId: { [Op.in]: courseIds } },
        attributes: ['id', 'title', 'courseId'],
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
        ],
      }),
      LessonProgress.findAll({
        where: {
          courseId: { [Op.in]: courseIds },
          completedAt: { [Op.ne]: null },
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
        ],
        order: [['completedAt', 'DESC']],
        limit: 10,
      }),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment.id);
    const quizIds = quizzes.map((quiz) => quiz.id);

    const [allCourseSubmissions, allQuizAttempts] = await Promise.all([
      assignmentIds.length
        ? Submission.findAll({
            where: { assignmentId: { [Op.in]: assignmentIds } },
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'firstName', 'lastName', 'email'],
              },
              {
                model: Assignment,
                as: 'assignment',
                attributes: ['id', 'title', 'courseId', 'maxScore'],
                include: [
                  {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'title'],
                  },
                ],
              },
            ],
            order: [['submittedAt', 'DESC']],
          })
        : [],
      quizIds.length
        ? QuizAttempt.findAll({
            where: { quizId: { [Op.in]: quizIds } },
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'firstName', 'lastName'],
              },
              {
                model: Quiz,
                as: 'quiz',
                attributes: ['id', 'title', 'courseId'],
                include: [
                  {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'title'],
                  },
                ],
              },
            ],
            order: [['completedAt', 'DESC']],
          })
        : [],
    ]);

    const pendingSubmissions = allCourseSubmissions.filter((submission) => submission.status === 'submitted');
    const submissionActivities = allCourseSubmissions.slice(0, 10);
    const quizActivities = allQuizAttempts.slice(0, 10);

    const pendingByCourseId = pendingSubmissions.reduce((map, submission) => {
      const courseId = submission.assignment?.course?.id;
      if (!courseId) {
        return map;
      }

      map.set(courseId, (map.get(courseId) || 0) + 1);
      return map;
    }, new Map());

    const courseStats = courses.map((course) => {
      const enrolledCount = course.enrollments.length;
      const avgProgress = enrolledCount
        ? round(
            course.enrollments.reduce(
              (total, enrollment) => total + Number(enrollment.completionPercentage || 0),
              0
            ) / enrolledCount
          )
        : 0;

      return {
        courseId: course.id,
        title: course.title,
        enrolledCount,
        avgProgress,
        pendingSubmissions: pendingByCourseId.get(course.id) || 0,
      };
    });

    const recentActivity = [
      ...lessonActivities.map((entry) => ({
        studentName: getFullName(entry.student),
        action: 'completed a lesson',
        course: entry.course?.title || 'Course',
        timestamp: entry.completedAt,
      })),
      ...submissionActivities.map((submission) => ({
        studentName: getFullName(submission.student),
        action: `submitted ${submission.assignment?.title || 'an assignment'}`,
        course: submission.assignment?.course?.title || 'Course',
        timestamp: submission.submittedAt,
      })),
      ...quizActivities.map((attempt) => ({
        studentName: getFullName(attempt.student),
        action: `completed ${attempt.quiz?.title || 'a quiz'}`,
        course: attempt.quiz?.course?.title || 'Course',
        timestamp: attempt.completedAt,
      })),
    ]
      .filter((entry) => entry.timestamp)
      .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp))
      .slice(0, 10);

    const uniqueStudents = new Set(
      courses.flatMap((course) => course.enrollments.map((enrollment) => enrollment.studentId))
    );
    const avgCourseCompletion = courseStats.length
      ? round(
          courseStats.reduce((total, course) => total + Number(course.avgProgress || 0), 0) /
            courseStats.length
        )
      : 0;

    return success(res, {
      courseStats,
      pendingGrading: pendingSubmissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        student: submission.student
          ? {
              id: submission.student.id,
              firstName: submission.student.firstName,
              lastName: submission.student.lastName,
              email: submission.student.email,
              fullName: getFullName(submission.student),
            }
          : null,
        assignment: submission.assignment
          ? {
              id: submission.assignment.id,
              title: submission.assignment.title,
              maxScore: submission.assignment.maxScore,
            }
          : null,
        course: submission.assignment?.course
          ? {
              id: submission.assignment.course.id,
              title: submission.assignment.course.title,
            }
          : null,
      })),
      recentActivity,
      totalStats: {
        totalStudents: uniqueStudents.size,
        totalCourses: courses.length,
        avgCourseCompletion,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const getCourseProgress = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const [course, enrollments, lessonProgressEntries, courseSubmissions, quizAttempts] = await Promise.all([
      Course.findByPk(req.params.id, {
        attributes: ['id', 'title', 'category'],
        include: [
          {
            model: Section,
            as: 'sections',
            separate: true,
            order: [['order', 'ASC']],
            include: [
              {
                model: Lesson,
                as: 'lessons',
                attributes: ['id', 'title', 'order'],
                separate: true,
                order: [['order', 'ASC']],
              },
            ],
          },
          {
            model: Assignment,
            as: 'assignments',
            attributes: ['id', 'title', 'maxScore'],
          },
          {
            model: Quiz,
            as: 'quizzes',
            attributes: ['id', 'title'],
          },
        ],
      }),
      Enrollment.findAll({
        where: { courseId: req.params.id },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
        order: [[{ model: User, as: 'student' }, 'firstName', 'ASC']],
      }),
      LessonProgress.findAll({
        where: { courseId: req.params.id, completedAt: { [Op.ne]: null } },
        attributes: ['studentId', 'lessonId', 'completedAt'],
      }),
      Submission.findAll({
        include: [
          {
            model: Assignment,
            as: 'assignment',
            attributes: ['id', 'title', 'courseId', 'maxScore'],
            where: { courseId: req.params.id },
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      }),
      QuizAttempt.findAll({
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['id', 'title', 'courseId'],
            where: { courseId: req.params.id },
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      }),
    ]);

    const progressByStudentId = lessonProgressEntries.reduce((map, entry) => {
      if (!map.has(entry.studentId)) {
        map.set(entry.studentId, []);
      }
      map.get(entry.studentId).push(entry);
      return map;
    }, new Map());

    const submissionsByStudentId = courseSubmissions.reduce((map, submission) => {
      if (!map.has(submission.studentId)) {
        map.set(submission.studentId, []);
      }
      map.get(submission.studentId).push(submission);
      return map;
    }, new Map());

    const attemptsByStudentId = quizAttempts.reduce((map, attempt) => {
      if (!map.has(attempt.studentId)) {
        map.set(attempt.studentId, []);
      }
      map.get(attempt.studentId).push(attempt);
      return map;
    }, new Map());

    const allLessons = course.sections.flatMap((section) => section.lessons || []);

    const students = enrollments.map((enrollment) => {
      const studentSubmissions = submissionsByStudentId.get(enrollment.studentId) || [];
      const studentAttempts = attemptsByStudentId.get(enrollment.studentId) || [];
      const gradedSubmissions = studentSubmissions.filter((submission) => submission.status === 'graded');

      return {
        student: {
          id: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
          fullName: getFullName(enrollment.student),
        },
        completionPercentage: enrollment.completionPercentage,
        assignmentsSubmitted: studentSubmissions.length,
        assignmentsGraded: gradedSubmissions.length,
        assignmentAverageScore: gradedSubmissions.length
          ? round(
              gradedSubmissions.reduce((total, submission) => {
                const maxScore = Number(submission.assignment?.maxScore || 0);
                if (!maxScore) {
                  return total;
                }

                return total + (Number(submission.score || 0) / maxScore) * 100;
              }, 0) / gradedSubmissions.length
            )
          : 0,
        quizAverageScore: studentAttempts.length
          ? round(
              studentAttempts.reduce((total, attempt) => total + Number(attempt.score || 0), 0) /
                studentAttempts.length
            )
          : 0,
      };
    });

    const lessonCompletionRates = allLessons.map((lesson) => {
      const completedCount = lessonProgressEntries.filter((entry) => entry.lessonId === lesson.id).length;
      const enrollmentCount = enrollments.length;

      return {
        lessonId: lesson.id,
        title: lesson.title,
        completedCount,
        completionRate: enrollmentCount ? round((completedCount / enrollmentCount) * 100) : 0,
      };
    });

    return success(res, {
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
      },
      students,
      lessonCompletionRates,
    });
  } catch (err) {
    return next(err);
  }
};

const getStudentCourseProgress = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      attributes: ['id', 'title', 'description', 'category', 'thumbnail', 'isPublished'],
      include: [
        {
          model: Section,
          as: 'sections',
          separate: true,
          order: [['order', 'ASC']],
          include: [
            {
              model: Lesson,
              as: 'lessons',
              attributes: ['id', 'title', 'order'],
              separate: true,
              order: [['order', 'ASC']],
            },
          ],
        },
      ],
    });

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    if (!course.isPublished) {
      return error(res, 'This course is currently unavailable to students', 403);
    }

    const enrollment = await Enrollment.findOne({
      where: { courseId: req.params.id, studentId: req.user.id },
    });

    if (!enrollment) {
      return error(res, 'You must be enrolled in this course first', 403);
    }

    const [lessonProgressEntries, submissions, attempts] = await Promise.all([
      LessonProgress.findAll({
        where: { courseId: req.params.id, studentId: req.user.id, completedAt: { [Op.ne]: null } },
        attributes: ['lessonId', 'completedAt'],
      }),
      Submission.findAll({
        where: { studentId: req.user.id },
        include: [
          {
            model: Assignment,
            as: 'assignment',
            attributes: ['id', 'title', 'courseId', 'maxScore', 'dueDate'],
            where: { courseId: req.params.id },
          },
        ],
        order: [['submittedAt', 'DESC']],
      }),
      QuizAttempt.findAll({
        where: { studentId: req.user.id },
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['id', 'title', 'courseId'],
            where: { courseId: req.params.id },
          },
        ],
        order: [['completedAt', 'DESC']],
      }),
    ]);

    const completedLessonIds = lessonProgressEntries.map((entry) => entry.lessonId);
    const totalLessons = course.sections.reduce(
      (total, section) => total + (section.lessons ? section.lessons.length : 0),
      0
    );

    return success(res, {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnail: course.thumbnail,
      },
      completionPercentage: enrollment.completionPercentage,
      totalLessons,
      completedLessons: {
        count: completedLessonIds.length,
        lessonIds: completedLessonIds,
      },
      grades: submissions
        .filter((submission) => submission.status === 'graded')
        .map((submission) => ({
          assignmentId: submission.assignment.id,
          title: submission.assignment.title,
          score: submission.score,
          maxScore: submission.assignment.maxScore,
          submittedAt: submission.submittedAt,
          feedback: submission.feedback,
        })),
      quizResults: attempts.map((attempt) => ({
        quizId: attempt.quiz.id,
        title: attempt.quiz.title,
        score: attempt.score,
        completedAt: attempt.completedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getStudentDashboard,
  getTeacherDashboard,
  getCourseProgress,
  getStudentCourseProgress,
};

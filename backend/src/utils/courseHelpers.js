const fs = require('fs');
const path = require('path');
const { Course, Enrollment, Lesson, LessonProgress, Material, Section } = require('../models');

const getUploadUrl = (filePath) => {
  if (!filePath) {
    return null;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');
  const uploadDir = (process.env.UPLOAD_DIR || 'uploads').replace(/\\/g, '/');
  const relativePath = normalizedPath.includes(uploadDir)
    ? normalizedPath.slice(normalizedPath.indexOf(uploadDir) + uploadDir.length + 1)
    : path.basename(normalizedPath);

  return `/uploads/${relativePath}`;
};

const getFileSize = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  return fs.statSync(filePath).size;
};

const serializeMaterial = (material) => ({
  id: material.id,
  title: material.title,
  type: material.type,
  filePath: material.filePath,
  url: material.url,
  lessonId: material.lessonId,
  courseId: material.courseId,
  fileUrl: getUploadUrl(material.filePath),
  fileSize: getFileSize(material.filePath),
});

const ensureCourseOwnership = async (courseId, user) => {
  const course = await Course.findByPk(courseId);

  if (!course) {
    return { error: { statusCode: 404, message: 'Course not found' } };
  }

  if (user.role === 'admin') {
    return { course };
  }

  if (user.role !== 'teacher' || course.teacherId !== user.id) {
    return { error: { statusCode: 403, message: 'You do not have access to this course' } };
  }

  return { course };
};

const ensureSectionOwnership = async (sectionId, user) => {
  const section = await Section.findByPk(sectionId, { include: [{ model: Course, as: 'course' }] });

  if (!section) {
    return { error: { statusCode: 404, message: 'Section not found' } };
  }

  const ownership = await ensureCourseOwnership(section.courseId, user);
  if (ownership.error) {
    return ownership;
  }

  return { section, course: ownership.course };
};

const ensureLessonOwnership = async (lessonId, user) => {
  const lesson = await Lesson.findByPk(lessonId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!lesson) {
    return { error: { statusCode: 404, message: 'Lesson not found' } };
  }

  const ownership = await ensureCourseOwnership(lesson.courseId, user);
  if (ownership.error) {
    return ownership;
  }

  return { lesson, course: ownership.course };
};

const ensureMaterialOwnership = async (materialId, user) => {
  const material = await Material.findByPk(materialId, {
    include: [{ model: Course, as: 'course' }],
  });

  if (!material) {
    return { error: { statusCode: 404, message: 'Material not found' } };
  }

  const ownership = await ensureCourseOwnership(material.courseId, user);
  if (ownership.error) {
    return ownership;
  }

  return { material, course: ownership.course };
};

const recalculateEnrollmentProgress = async (studentId, courseId) => {
  const [totalLessons, completedLessons, enrollment] = await Promise.all([
    Lesson.count({ where: { courseId } }),
    LessonProgress.count({ where: { studentId, courseId } }),
    Enrollment.findOne({ where: { studentId, courseId } }),
  ]);

  if (!enrollment) {
    return null;
  }

  const completionPercentage = totalLessons
    ? Number(((completedLessons / totalLessons) * 100).toFixed(2))
    : 0;

  enrollment.completionPercentage = completionPercentage;
  await enrollment.save();

  return enrollment;
};

module.exports = {
  ensureCourseOwnership,
  ensureSectionOwnership,
  ensureLessonOwnership,
  ensureMaterialOwnership,
  recalculateEnrollmentProgress,
  serializeMaterial,
  getUploadUrl,
};

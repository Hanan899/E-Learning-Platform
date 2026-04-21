const fs = require('fs');
const path = require('path');
const {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Material,
  Section,
} = require('../models');
const { error, success } = require('../utils/responseHelper');
const {
  ensureCourseOwnership,
  ensureLessonOwnership,
  ensureMaterialOwnership,
  ensureSectionOwnership,
  recalculateEnrollmentProgress,
  serializeMaterial,
} = require('../utils/courseHelpers');

const detectMaterialType = (file) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === '.pdf') {
    return 'pdf';
  }

  if (['.jpg', '.jpeg', '.png'].includes(extension)) {
    return 'image';
  }

  return 'document';
};

const createSection = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const section = await Section.create({
      title: req.body.title.trim(),
      order: Number(req.body.order) || 1,
      courseId: req.params.courseId,
    });

    return success(res, { section }, 'Section created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateSection = async (req, res, next) => {
  try {
    const ownership = await ensureSectionOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { section } = ownership;
    await section.update({
      title: req.body.title?.trim() || section.title,
      order:
        Object.prototype.hasOwnProperty.call(req.body, 'order') && req.body.order !== undefined
          ? Number(req.body.order)
          : section.order,
    });

    return success(res, { section }, 'Section updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteSection = async (req, res, next) => {
  try {
    const ownership = await ensureSectionOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    await ownership.section.destroy();
    return success(res, null, 'Section deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const reorderSections = async (req, res, next) => {
  try {
    const ownership = await ensureCourseOwnership(req.params.courseId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const updates = req.body.sections || [];
    const validSectionIds = new Set(
      (
        await Section.findAll({
          where: { courseId: req.params.courseId },
          attributes: ['id'],
        })
      ).map((section) => section.id)
    );

    await Promise.all(
      updates.map(({ id, order }) => {
        if (!validSectionIds.has(id)) {
          return null;
        }

        return Section.update({ order }, { where: { id } });
      })
    );

    const sections = await Section.findAll({
      where: { courseId: req.params.courseId },
      order: [['order', 'ASC']],
    });

    return success(res, { sections }, 'Sections reordered successfully');
  } catch (err) {
    return next(err);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const ownership = await ensureSectionOwnership(req.params.sectionId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const lesson = await Lesson.create({
      title: req.body.title.trim(),
      content: req.body.content || '',
      order: Number(req.body.order) || 1,
      sectionId: req.params.sectionId,
      courseId: ownership.section.courseId,
    });

    return success(res, { lesson }, 'Lesson created successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const updateLesson = async (req, res, next) => {
  try {
    const ownership = await ensureLessonOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { lesson } = ownership;
    await lesson.update({
      title: req.body.title?.trim() || lesson.title,
      content:
        Object.prototype.hasOwnProperty.call(req.body, 'content') ? req.body.content : lesson.content,
      order:
        Object.prototype.hasOwnProperty.call(req.body, 'order') && req.body.order !== undefined
          ? Number(req.body.order)
          : lesson.order,
    });

    return success(res, { lesson }, 'Lesson updated successfully');
  } catch (err) {
    return next(err);
  }
};

const deleteLesson = async (req, res, next) => {
  try {
    const ownership = await ensureLessonOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    await ownership.lesson.destroy();
    return success(res, null, 'Lesson deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const uploadMaterial = async (req, res, next) => {
  try {
    const ownership = await ensureLessonOwnership(req.params.lessonId, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { lesson } = ownership;

    if (!req.file && !req.body.url) {
      return error(res, 'A file or video URL is required', 400);
    }

    const type = req.body.type === 'video_link' || req.body.url ? 'video_link' : detectMaterialType(req.file);
    const material = await Material.create({
      title: req.body.title?.trim() || req.file?.originalname || 'Video material',
      type,
      filePath: req.file?.path || null,
      url: type === 'video_link' ? req.body.url?.trim() || null : null,
      lessonId: lesson.id,
      courseId: lesson.courseId,
    });

    return success(res, { material: serializeMaterial(material) }, 'Material uploaded successfully', 201);
  } catch (err) {
    return next(err);
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const ownership = await ensureMaterialOwnership(req.params.id, req.user);
    if (ownership.error) {
      return error(res, ownership.error.message, ownership.error.statusCode);
    }

    const { material } = ownership;
    if (material.filePath && fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
    }

    await material.destroy();

    return success(res, null, 'Material deleted successfully');
  } catch (err) {
    return next(err);
  }
};

const markLessonComplete = async (req, res, next) => {
  try {
    const completedAt = new Date().toISOString();
    const lesson = await Lesson.findByPk(req.params.id);

    if (!lesson) {
      return error(res, 'Lesson not found', 404);
    }

    const course = await Course.findByPk(lesson.courseId, {
      attributes: ['id', 'isPublished'],
    });

    if (!course) {
      return error(res, 'Course not found', 404);
    }

    if (!course.isPublished) {
      return error(res, 'This course is currently unavailable to students', 403);
    }

    const enrollment = await Enrollment.findOne({
      where: { studentId: req.user.id, courseId: lesson.courseId },
    });

    if (!enrollment) {
      return error(res, 'You must be enrolled in this course first', 403);
    }

    let progress = await LessonProgress.findOne({
      where: {
        studentId: req.user.id,
        lessonId: lesson.id,
      },
    });

    if (!progress) {
      progress = await LessonProgress.create({
        studentId: req.user.id,
        lessonId: lesson.id,
        courseId: lesson.courseId,
        completedAt,
      });
    } else if (!progress.completedAt) {
      progress.completedAt = completedAt;
      await progress.save();
    }

    const updatedEnrollment = await recalculateEnrollmentProgress(req.user.id, lesson.courseId);

    return success(res, {
      progress,
      completionPercentage: updatedEnrollment?.completionPercentage ?? 0,
    }, 'Lesson marked complete');
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadMaterial,
  deleteMaterial,
  markLessonComplete,
};

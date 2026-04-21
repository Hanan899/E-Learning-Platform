import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiChevronDown,
  HiChevronRight,
  HiMiniPlus,
  HiOutlinePhoto,
  HiOutlineQuestionMarkCircle,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import LessonEditor from '../../components/courses/LessonEditor';
import AppLayout from '../../components/layout/AppLayout';
import { apiOrigin } from '../../utils/api';

const courseCategories = ['Math', 'Science', 'History', 'Language Arts', 'Technology'];

const fetchCourse = async (id) => {
  const response = await axiosInstance.get(`/courses/${id}`);
  return response.data.data.course;
};

function CourseEditorPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [courseDraft, setCourseDraft] = useState({
    title: '',
    description: '',
    category: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['teacher-course', id],
    queryFn: () => fetchCourse(id),
  });

  const courseSections = useMemo(
    () =>
      (course?.sections || []).map((section) => ({
        ...section,
        lessons: section.lessons || [],
      })),
    [course?.sections]
  );

  const selectedLesson = useMemo(() => {
    const allLessons = courseSections.flatMap((section) => section.lessons || []);
    return allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0] || null;
  }, [courseSections, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId && courseSections.length) {
      const firstLesson = courseSections.flatMap((section) => section.lessons || [])[0];
      setSelectedLessonId(firstLesson?.id || null);
    }
  }, [courseSections, selectedLessonId]);

  useEffect(() => {
    if (!course) {
      return;
    }

    setCourseDraft({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
    });
    setThumbnailFile(null);
    setThumbnailPreviewUrl(course.thumbnailUrl ? `${apiOrigin}${course.thumbnailUrl}` : '');
  }, [course?.id, course?.title, course?.description, course?.category, course?.thumbnailUrl]);

  useEffect(() => {
    if (!thumbnailFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  const invalidateCourse = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-course', id] });
    queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
    queryClient.invalidateQueries({ queryKey: ['student-courses'] });
  };

  const updateCourseMutation = useMutation({
    mutationFn: async (payload) => {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      const response = await axiosInstance.put(`/courses/${id}`, formData);
      return response.data.data.course;
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(['teacher-course', id], updatedCourse);
      setCourseDraft({
        title: updatedCourse.title || '',
        description: updatedCourse.description || '',
        category: updatedCourse.category || '',
      });
      setThumbnailFile(null);
      setThumbnailPreviewUrl(updatedCourse.thumbnailUrl ? `${apiOrigin}${updatedCourse.thumbnailUrl}` : '');
      toast.success('Course updated');
      invalidateCourse();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to update course');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.put(`/courses/${id}/publish`);
      return response.data.data.course;
    },
    onSuccess: () => {
      invalidateCourse();
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.post(`/courses/${id}/sections`, payload);
      return response.data.data.section;
    },
    onSuccess: () => {
      setNewSectionTitle('');
      invalidateCourse();
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (sections) => {
      await axiosInstance.put(`/courses/${id}/sections/reorder`, { sections });
    },
    onSuccess: invalidateCourse,
  });

  const createLessonMutation = useMutation({
    mutationFn: async ({ sectionId, payload }) => {
      const response = await axiosInstance.post(`/sections/${sectionId}/lessons`, payload);
      return response.data.data.lesson;
    },
    onSuccess: (lesson) => {
      invalidateCourse();
      setSelectedLessonId(lesson.id);
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, payload }) => {
      const response = await axiosInstance.put(`/lessons/${lessonId}`, payload);
      return response.data.data.lesson;
    },
    onSuccess: invalidateCourse,
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId) => {
      await axiosInstance.delete(`/lessons/${lessonId}`);
    },
    onSuccess: () => {
      setSelectedLessonId(null);
      invalidateCourse();
    },
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async ({ lessonId, payload, onUploadProgress }) => {
      const formData = new FormData();
      if (payload.file) {
        formData.append('file', payload.file);
      }
      if (payload.url) {
        formData.append('url', payload.url);
      }
      if (payload.type) {
        formData.append('type', payload.type);
      }
      if (payload.title) {
        formData.append('title', payload.title);
      }
      const response = await axiosInstance.post(`/lessons/${lessonId}/materials`, formData, {
        onUploadProgress,
      });
      return response.data.data.material;
    },
    onSuccess: invalidateCourse,
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId) => {
      await axiosInstance.delete(`/materials/${materialId}`);
    },
    onSuccess: invalidateCourse,
  });

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/courses/${id}/quizzes`, {
        title: `${course.title} Quiz ${(course.quizzes || []).length + 1}`,
      });
      return response.data.data.quiz;
    },
    onSuccess: (createdQuiz) => {
      invalidateCourse();
      window.location.assign(`/teacher/quizzes/${createdQuiz.id}/build`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to create quiz');
    },
  });

  const handleDropSection = (targetSectionId) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId || !course) {
      return;
    }

    const reordered = [...courseSections];
    const sourceIndex = reordered.findIndex((section) => section.id === draggedSectionId);
    const targetIndex = reordered.findIndex((section) => section.id === targetSectionId);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    reorderSectionsMutation.mutate(
      reordered.map((section, index) => ({
        id: section.id,
        order: index + 1,
      }))
    );
    setDraggedSectionId(null);
  };

  const totalLessons = courseSections.reduce((total, section) => total + section.lessons.length, 0);
  const hasCourseDetailChanges =
    courseDraft.title !== (course?.title || '') ||
    courseDraft.description !== (course?.description || '') ||
    courseDraft.category !== (course?.category || '') ||
    Boolean(thumbnailFile);

  const handleSaveCourseDetails = () => {
    updateCourseMutation.mutate({
      title: courseDraft.title,
      description: courseDraft.description,
      category: courseDraft.category,
      thumbnail: thumbnailFile,
    });
  };

  if (isLoading || !course) {
    return (
      <AppLayout title="Course Editor">
        <div className="card p-10 text-center text-slate-500">Loading course editor...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Course Editor">
      <section className="mb-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-primary">Teacher workspace</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Course Details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the core information students see before they open the course.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <span>{course.isPublished ? 'Published' : 'Draft'}</span>
              <button
                type="button"
                className={`relative h-7 w-12 rounded-full transition ${
                  course.isPublished ? 'bg-accent' : 'bg-slate-300'
                }`}
                onClick={() => togglePublishMutation.mutate()}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    course.isPublished ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="course-editor-title">
                Course title
              </label>
              <input
                id="course-editor-title"
                className="input"
                value={courseDraft.title}
                onChange={(event) =>
                  setCourseDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="course-editor-category">
                  Category
                </label>
                <select
                  id="course-editor-category"
                  className="input"
                  value={courseDraft.category}
                  onChange={(event) =>
                    setCourseDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {courseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Thumbnail</label>
                <label className="flex min-h-[132px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-center text-sm text-slate-500 transition hover:border-primary/40 hover:bg-primary/5">
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png"
                    onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)}
                  />
                  {thumbnailPreviewUrl ? (
                    <img src={thumbnailPreviewUrl} alt="Course thumbnail preview" className="h-24 w-full rounded-2xl object-cover" />
                  ) : (
                    <div>
                      <p className="font-medium text-slate-700">Upload course cover</p>
                      <p className="mt-1 text-sm text-slate-500">PNG or JPG recommended</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="course-editor-description">
                Description
              </label>
              <textarea
                id="course-editor-description"
                className="input min-h-[150px] resize-none"
                value={courseDraft.description}
                onChange={(event) =>
                  setCourseDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Write what students will learn, what the course covers, and how the lessons flow."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                <span>{courseSections.length} sections</span>
                <span>{totalLessons} lessons</span>
                <span>{(course.quizzes || []).length} quizzes</span>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveCourseDetails}
                disabled={!hasCourseDetailChanges || updateCourseMutation.isPending}
              >
                {updateCourseMutation.isPending ? 'Saving...' : 'Save details'}
              </button>
            </div>
          </div>
        </article>

        <article className="card overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-primary/10 px-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Student Preview
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Course Preview</h2>
              <p className="mt-1 text-sm text-slate-600">
                A live snapshot of how this course is presented before students open it.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-primary/5 text-slate-950 shadow-gentle">
              {thumbnailPreviewUrl ? (
                <img src={thumbnailPreviewUrl} alt="Course cover" className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-primary/10 via-white to-accent/10">
                  <div className="rounded-3xl bg-white p-4 text-primary shadow-sm">
                    <HiOutlinePhoto className="text-4xl" />
                  </div>
                </div>
              )}

              <div className="p-6">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {courseDraft.category || 'General'}
                </span>
                <h3 className="mt-4 text-3xl font-extrabold text-slate-950">
                  {courseDraft.title || 'Untitled course'}
                </h3>
                <p className="mt-3 text-slate-600">
                  Teacher: {course.teacher?.firstName} {course.teacher?.lastName}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  {courseDraft.description || 'Your course description preview will appear here once you add one.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Sections</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{courseSections.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Lessons</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{totalLessons}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Quizzes</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{(course.quizzes || []).length}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Outline Preview</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Students will browse sections and lessons in this order.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {courseSections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    Add sections and lessons to see the course outline preview.
                  </div>
                ) : (
                  courseSections.slice(0, 3).map((section) => (
                    <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900">{section.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {section.lessons.length} lesson{section.lessons.length === 1 ? '' : 's'}
                      </p>
                      <div className="mt-3 space-y-2">
                        {section.lessons.slice(0, 2).map((lesson) => (
                          <div key={lesson.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Preview lesson: {lesson.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="card p-4" data-testid="course-editor-sidebar">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Course Structure</h2>
              <p className="mt-1 text-sm text-slate-500">Reorder sections and open lessons.</p>
            </div>
            <HiOutlineSquares2X2 className="text-2xl text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {courseSections.map((section) => {
              const isCollapsed = collapsedSections[section.id];

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  draggable
                  onDragStart={() => setDraggedSectionId(section.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropSection(section.id)}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() =>
                      setCollapsedSections((current) => ({
                        ...current,
                        [section.id]: !current[section.id],
                      }))
                    }
                  >
                    <span className="font-medium text-slate-900">{section.title}</span>
                    {isCollapsed ? <HiChevronRight /> : <HiChevronDown />}
                  </button>

                  {!isCollapsed ? (
                    <div className="mt-3 space-y-2">
                      {section.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                            selectedLesson?.id === lesson.id
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                          onClick={() => setSelectedLessonId(lesson.id)}
                        >
                          {lesson.title}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn-secondary w-full justify-center"
                        onClick={() =>
                          createLessonMutation.mutate({
                            sectionId: section.id,
                            payload: {
                              title: `New Lesson ${section.lessons.length + 1}`,
                              content: '',
                              order: section.lessons.length + 1,
                            },
                          })
                        }
                      >
                        <HiMiniPlus className="mr-2 text-lg" />
                        Add Lesson
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Quizzes</h3>
                  <p className="mt-1 text-sm text-slate-500">Build timed MCQ checks for this course.</p>
                </div>
                <HiOutlineQuestionMarkCircle className="text-2xl text-slate-400" />
              </div>

              <div className="mt-4 space-y-3">
                {(course.quizzes || []).map((quiz) => (
                  <div key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="font-medium text-slate-900">{quiz.title}</p>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/teacher/quizzes/${quiz.id}/build`} className="btn-secondary px-3 py-2 text-xs">
                        Build
                      </Link>
                      <Link to={`/teacher/quizzes/${quiz.id}/results`} className="btn-secondary px-3 py-2 text-xs">
                        Results
                      </Link>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => createQuizMutation.mutate()}
                >
                  <HiMiniPlus className="mr-2 text-lg" />
                  Create Quiz
                </button>
              </div>
            </div>

            <input
              className="input"
              placeholder="New section title"
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
            />
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() =>
                createSectionMutation.mutate({
                  title: newSectionTitle || `Section ${courseSections.length + 1}`,
                  order: courseSections.length + 1,
                })
              }
            >
              Add Section
            </button>
          </div>
        </aside>

        <LessonEditor
          lesson={selectedLesson}
          onSave={(lessonId, payload) =>
            updateLessonMutation.mutate({
              lessonId,
              payload: {
                title: payload.title,
                content: payload.content,
                order: payload.order,
              },
            })
          }
          onDelete={(lessonId) => deleteLessonMutation.mutate(lessonId)}
          onUploadMaterial={(lessonId, payload, onUploadProgress) =>
            uploadMaterialMutation.mutateAsync({ lessonId, payload, onUploadProgress })
          }
          onDeleteMaterial={(materialId) => deleteMaterialMutation.mutate(materialId)}
        />
      </div>
    </AppLayout>
  );
}

export default CourseEditorPage;

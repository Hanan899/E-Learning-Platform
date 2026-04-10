import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiChevronDown,
  HiChevronRight,
  HiMiniPlus,
  HiOutlineEye,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import LessonEditor from '../../components/courses/LessonEditor';
import AppLayout from '../../components/layout/AppLayout';

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

  const { data: course, isLoading } = useQuery({
    queryKey: ['teacher-course', id],
    queryFn: () => fetchCourse(id),
  });

  const selectedLesson = useMemo(() => {
    const allLessons = course?.sections.flatMap((section) => section.lessons) || [];
    return allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0] || null;
  }, [course?.sections, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId && course?.sections?.length) {
      const firstLesson = course.sections.flatMap((section) => section.lessons)[0];
      setSelectedLessonId(firstLesson?.id || null);
    }
  }, [course?.sections, selectedLessonId]);

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
    onSuccess: () => {
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

  const handleDropSection = (targetSectionId) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId || !course) {
      return;
    }

    const reordered = [...course.sections];
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

  if (isLoading || !course) {
    return (
      <AppLayout title="Course Editor">
        <div className="card p-10 text-center text-slate-500">Loading course editor...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Course Editor">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.25em] text-primary">Teacher workspace</p>
          <input
            className="mt-2 w-full border-none bg-transparent p-0 font-heading text-3xl font-bold outline-none"
            value={course.title}
            onChange={(event) => updateCourseMutation.mutate({ title: event.target.value })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.open(`/student/courses/${id}`, '_blank')}
          >
            <HiOutlineEye className="mr-2 text-lg" />
            Preview
          </button>
        </div>
      </div>

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
            {course.sections.map((section) => {
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
                  title: newSectionTitle || `Section ${course.sections.length + 1}`,
                  order: course.sections.length + 1,
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

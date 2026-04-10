import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiOutlineDocumentText, HiOutlineFilm, HiOutlinePhoto } from 'react-icons/hi2';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';

const fetchCourse = async (id) => {
  const response = await axiosInstance.get(`/courses/${id}`);
  return response.data.data.course;
};

const toEmbedUrl = (url) => {
  if (!url) {
    return null;
  }

  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('watch?v=', 'embed/');
  }

  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/');
  }

  if (url.includes('vimeo.com/')) {
    const id = url.split('/').pop();
    return `https://player.vimeo.com/video/${id}`;
  }

  return url;
};

function MaterialViewer({ material }) {
  if (material.type === 'image') {
    return <img src={`http://localhost:5001${material.fileUrl}`} alt={material.title} className="mt-3 max-h-72 rounded-2xl object-cover" />;
  }

  if (material.type === 'pdf') {
    return (
      <iframe
        title={material.title}
        src={`http://localhost:5001${material.fileUrl}`}
        className="mt-3 h-80 w-full rounded-2xl border border-slate-200"
      />
    );
  }

  if (material.type === 'video_link') {
    return (
      <iframe
        title={material.title}
        src={toEmbedUrl(material.url)}
        className="mt-3 h-80 w-full rounded-2xl border border-slate-200"
        allowFullScreen
      />
    );
  }

  return (
    <a
      href={`http://localhost:5001${material.fileUrl}`}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
    >
      Open document
    </a>
  );
}

function CourseViewPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const { data: course, isLoading } = useQuery({
    queryKey: ['student-course', id],
    queryFn: () => fetchCourse(id),
  });

  const selectedLesson = useMemo(() => {
    const lessons = course?.sections.flatMap((section) => section.lessons) || [];
    return lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0] || null;
  }, [course?.sections, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId && course?.sections?.length) {
      const firstLesson = course.sections.flatMap((section) => section.lessons)[0];
      setSelectedLessonId(firstLesson?.id || null);
    }
  }, [course?.sections, selectedLessonId]);

  const completeMutation = useMutation({
    mutationFn: async (lessonId) => {
      const response = await axiosInstance.post(`/lessons/${lessonId}/complete`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Lesson marked complete');
      queryClient.invalidateQueries({ queryKey: ['student-course', id] });
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to update progress');
    },
  });

  const completedLessonIds = course?.studentProgress?.completedLessonIds || [];

  if (isLoading || !course) {
    return (
      <AppLayout title="Course View">
        <div className="card p-10 text-center text-slate-500">Loading course content...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Course View">
      <section className="card overflow-hidden border-none bg-slate-950 p-8 text-white shadow-gentle">
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
              {course.category || 'General'}
            </span>
            <h2 className="mt-4 text-4xl font-extrabold text-white">{course.title}</h2>
            <p className="mt-3 text-slate-300">Teacher: {course.teacher?.firstName} {course.teacher?.lastName}</p>
            <p className="mt-4 max-w-3xl text-slate-300">{course.description}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Course progress</p>
            <p className="mt-2 text-3xl font-bold text-white" data-testid="progress-percentage">
              {course.studentProgress?.completionPercentage ?? 0}%
            </p>
            <div className="mt-4 h-3 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-accent"
                style={{ width: `${course.studentProgress?.completionPercentage ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="card p-5">
          <h3 className="text-xl font-bold">Course Outline</h3>
          <div className="mt-5 space-y-4">
            {course.sections.map((section) => (
              <div key={section.id}>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                      onClick={() => setSelectedLessonId(lesson.id)}
                    >
                      <span>{lesson.title}</span>
                      {completedLessonIds.includes(lesson.id) ? (
                        <HiCheckCircle className="text-lg text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <article className="card p-6">
            <h3 className="text-2xl font-bold">{selectedLesson?.title}</h3>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {selectedLesson?.content || 'No lesson content available yet.'}
            </div>
          </article>

          <article className="card p-6">
            <h3 className="text-2xl font-bold">Lesson Materials</h3>
            <div className="mt-5 space-y-5">
              {(selectedLesson?.materials || []).map((material) => {
                const icon =
                  material.type === 'image'
                    ? HiOutlinePhoto
                    : material.type === 'video_link'
                      ? HiOutlineFilm
                      : HiOutlineDocumentText;
                const Icon = icon;

                return (
                  <div key={material.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary">
                        <Icon className="text-2xl" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{material.title}</p>
                        <p className="text-sm text-slate-500 capitalize">{material.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <MaterialViewer material={material} />
                  </div>
                );
              })}
            </div>
          </article>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => completeMutation.mutate(selectedLesson.id)}
              disabled={!selectedLesson || completedLessonIds.includes(selectedLesson.id)}
            >
              {selectedLesson && completedLessonIds.includes(selectedLesson.id)
                ? 'Completed'
                : 'Mark as Complete'}
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default CourseViewPage;

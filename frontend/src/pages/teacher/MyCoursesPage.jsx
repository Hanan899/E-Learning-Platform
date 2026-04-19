import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBookOpen, HiOutlinePlus } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import CreateCourseModal from '../../components/courses/CreateCourseModal';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import { resolveAssetUrl } from '../../utils/api';

const fetchCourses = async () => {
  const response = await axiosInstance.get('/courses');
  return response.data.data.courses;
};

function CourseCard({ course }) {
  return (
    <article className="card overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-primary/20 via-slate-100 to-accent/20">
        {course.thumbnailUrl ? (
          <img src={resolveAssetUrl(course.thumbnailUrl)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            No thumbnail yet
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {course.category || 'General'}
            </span>
            <h3 className="mt-3 text-xl font-bold">{course.title}</h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              course.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">{course.description}</p>

        <div className="mt-5 flex gap-4 text-sm text-slate-500">
          <span>{course.lessonCount} lessons</span>
          <span>{course.enrollmentCount} enrollments</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link to={`/teacher/courses/${course.id}/edit`} className="btn-primary flex-1 text-center">
            Edit
          </Link>
          <Link to={`/teacher/courses/${course.id}/gradebook`} className="btn-secondary flex-1 text-center">
            Gradebook
          </Link>
          <Link to={`/student/courses/${course.id}`} className="btn-secondary flex-1 text-center">
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

function MyCoursesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: courses = [], isLoading, isError, error } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: fetchCourses,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (payload) => {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('description', payload.description);
      formData.append('category', payload.category);
      if (payload.thumbnail) {
        formData.append('thumbnail', payload.thumbnail);
      }

      const response = await axiosInstance.post('/courses', formData);
      return response.data.data.course;
    },
    onSuccess: () => {
      toast.success('Course created successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to create course');
    },
  });

  return (
    <AppLayout title="My Courses">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage your course library</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create new courses, keep drafts organized, and jump back into editing quickly.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <HiOutlinePlus className="mr-2 text-lg" />
          Create New Course
        </button>
      </div>

      {isLoading ? (
        <div className="mt-8">
          <PageLoader label="Loading your courses..." />
        </div>
      ) : isError ? (
        <div className="mt-8">
          <ErrorAlert
            title="We could not load your courses"
            message={error?.response?.data?.message || 'Please refresh the page and try again.'}
          />
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={HiOutlineBookOpen}
            title="Create your first course"
            description="Start with a course shell, then organize sections, lessons, and materials from the editor."
            actionLabel="Create your first course"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(values) => createCourseMutation.mutateAsync(values)}
      />
    </AppLayout>
  );
}

export default MyCoursesPage;

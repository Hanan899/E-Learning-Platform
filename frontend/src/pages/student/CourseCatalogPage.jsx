import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import { resolveAssetUrl } from '../../utils/api';

const fetchCourses = async ({ queryKey }) => {
  const [, params] = queryKey;
  const response = await axiosInstance.get('/courses', { params });
  return response.data.data.courses;
};

function CourseCard({ course, onEnroll }) {
  return (
    <article className="card flex h-full flex-col overflow-hidden" data-testid="course-card">
      <div className="h-44 bg-gradient-to-br from-primary/20 via-slate-100 to-accent/20">
        {course.thumbnailUrl ? (
          <img src={resolveAssetUrl(course.thumbnailUrl)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            Course cover
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {course.category || 'General'}
            </span>
            {course.isEnrolled ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Enrolled
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-xl font-bold">{course.title}</h3>

          <div className="mt-3 space-y-1 text-sm text-slate-500">
            <p>Teacher: {course.teacher?.fullName || 'Unknown'}</p>
            <p>{course.lessonCount} lessons</p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          {course.isEnrolled ? (
            <Link to={`/student/courses/${course.id}`} className="btn-primary flex-1 text-center">
              View Course
            </Link>
          ) : (
            <button type="button" className="btn-primary flex-1" onClick={() => onEnroll(course.id)}>
              Enroll
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CourseCatalogPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: [
      'student-courses',
      {
        search,
        category: category === 'All' ? undefined : category,
      },
    ],
    queryFn: fetchCourses,
  });

  const categories = useMemo(() => {
    const values = Array.from(new Set(courses.map((course) => course.category).filter(Boolean)));
    return ['All', ...values];
  }, [courses]);

  const enrolledCourses = courses.filter((course) => course.isEnrolled);
  const catalogCourses = courses.filter((course) => !course.isEnrolled);

  const enrollMutation = useMutation({
    mutationFn: async (courseId) => {
      await axiosInstance.post(`/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      toast.success('Enrollment successful');
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to enroll');
    },
  });

  return (
    <AppLayout title="Course Catalog">
      <section className="card p-6">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-11"
            placeholder="Search courses by title, category, or topic..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {categories.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === tab
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setCategory(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="card mt-8 p-10 text-center text-slate-500">Loading courses...</div>
      ) : (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Enrolled Courses</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {enrolledCourses.length}
              </span>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="card p-8 text-sm text-slate-500">
                You are not enrolled in any courses yet. Browse the catalog below to get started.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onEnroll={() => {}} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Available Courses</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                {catalogCourses.length}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {catalogCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEnroll={(courseId) => enrollMutation.mutate(courseId)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}

export default CourseCatalogPage;

import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiEllipsisHorizontal,
  HiOutlineBookOpen,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
} from 'react-icons/hi2';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import { getInitials } from '../../utils/formatters';

const fetchAdminCourses = async ({ queryKey }) => {
  const [, params] = queryKey;
  const normalizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined)
  );
  const response = await axiosInstance.get('/admin/courses', { params: normalizedParams });
  return response.data.data;
};

const fetchCourseReport = async ({ queryKey }) => {
  const [, courseId] = queryKey;
  const response = await axiosInstance.get(`/admin/reports/course/${courseId}`);
  return response.data.data;
};

function CoursesManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const coursesQuery = useQuery({
    queryKey: ['admin-courses', { status, category, teacherId, search: debouncedSearch }],
    queryFn: fetchAdminCourses,
  });

  const reportQuery = useQuery({
    queryKey: ['admin-course-report', selectedCourseId],
    queryFn: fetchCourseReport,
    enabled: Boolean(selectedCourseId),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ courseId, isPublished }) => {
      const response = await axiosInstance.put(`/admin/courses/${courseId}/status`, { isPublished });
      return response.data.data.course;
    },
    onSuccess: () => {
      toast.success('Course status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-overview'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to update course status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId) => {
      await axiosInstance.delete(`/admin/courses/${courseId}`, { data: { confirm: true } });
    },
    onSuccess: () => {
      toast.success('Course deleted');
      setCourseToDelete(null);
      setSelectedCourseId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-overview'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to delete course');
    },
  });

  const data = coursesQuery.data;
  const courses = data?.courses || [];
  const filters = data?.filters || { categories: [], teachers: [] };
  const report = reportQuery.data;

  return (
    <AppLayout title="Courses Management">
      <div className="space-y-6">
        <section className="card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Course catalog control</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review published status, completion trends, and course health from one place.
              </p>
            </div>

            <label className="relative block w-full max-w-sm">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-11"
                placeholder="Search by course title"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[auto_auto_220px_220px]">
            <div className="flex flex-wrap gap-2">
              {[
                { value: '', label: 'All' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    status === option.value
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
              <option value="">All Categories</option>
              {filters.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="input">
              <option value="">All Teachers</option>
              {filters.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {coursesQuery.isLoading ? (
          <PageLoader label="Loading courses..." />
        ) : coursesQuery.isError ? (
          <ErrorAlert
            title="We could not load courses"
            message="Please refresh the page and try again."
          />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={HiOutlineBookOpen}
            title="No courses match this filter"
            description="Try broadening the filters or search phrase to see more results."
          />
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-4 font-medium">Course title</th>
                    <th className="px-4 py-4 font-medium">Teacher</th>
                    <th className="px-4 py-4 font-medium">Category</th>
                    <th className="px-4 py-4 font-medium">Enrollments</th>
                    <th className="px-4 py-4 font-medium">Avg completion</th>
                    <th className="px-4 py-4 font-medium">Assignments / Quizzes</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setSelectedCourseId(course.id)}
                        >
                          <p className="font-semibold text-slate-950 hover:text-primary">{course.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{course.status}</p>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-heading font-bold text-slate-700">
                            {getInitials(course.teacher?.firstName, course.teacher?.lastName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{course.teacher?.name}</p>
                            <p className="text-slate-500">{course.teacher?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {course.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{course.enrollmentCount}</td>
                      <td className="px-4 py-4">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{Math.round(course.completionRate)}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(course.completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {course.assignmentCount} / {course.quizCount}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className={`inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-sm font-semibold ${
                            course.isPublished
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                          onClick={() =>
                            statusMutation.mutate({
                              courseId: course.id,
                              isPublished: !course.isPublished,
                            })
                          }
                        >
                          {course.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Menu as="div" className="relative inline-block text-left">
                          <MenuButton className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500">
                            <HiEllipsisHorizontal className="text-xl" />
                          </MenuButton>
                          <MenuItems
                            anchor="bottom end"
                            className="mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg focus:outline-none"
                          >
                            <MenuItem>
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setSelectedCourseId(course.id)}
                              >
                                View Report
                              </button>
                            </MenuItem>
                            <MenuItem>
                              <button
                                type="button"
                                className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                onClick={() => setCourseToDelete(course)}
                              >
                                Delete
                              </button>
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <Dialog open={Boolean(selectedCourseId)} onClose={() => setSelectedCourseId(null)} className="relative z-[65]">
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <DialogPanel className="w-full rounded-[2rem] bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Course Report</p>
                  <DialogTitle className="mt-2 text-2xl font-bold text-slate-950">
                    {report?.course.title || 'Loading report'}
                  </DialogTitle>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                  onClick={() => setSelectedCourseId(null)}
                >
                  <HiOutlineXMark className="text-2xl" />
                </button>
              </div>

              {reportQuery.isLoading ? (
                <div className="px-6 py-10">
                  <PageLoader label="Loading course report..." />
                </div>
              ) : reportQuery.isError ? (
                <div className="px-6 py-8">
                  <ErrorAlert
                    title="We could not load the course report"
                    message="Please try again in a moment."
                  />
                </div>
              ) : report ? (
                <div className="space-y-6 px-6 py-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <article className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Enrollment</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {report.analytics.enrollmentCount}
                      </p>
                    </article>
                    <article className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Completion</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {Math.round(report.analytics.avgCompletionPercentage)}%
                      </p>
                    </article>
                    <article className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Lessons</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{report.analytics.lessonCount}</p>
                    </article>
                    <article className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Class Average</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {Math.round(report.classAverage)}%
                      </p>
                    </article>
                  </div>

                  <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <article className="card p-5">
                      <h3 className="text-xl font-bold text-slate-950">Students</h3>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-slate-100 text-slate-400">
                            <tr>
                              <th className="pb-3 font-medium">Student</th>
                              <th className="pb-3 font-medium">Completion</th>
                              <th className="pb-3 font-medium">Average</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {report.students.slice(0, 12).map((student) => (
                              <tr key={student.id}>
                                <td className="py-3 text-slate-800">{student.name}</td>
                                <td className="py-3 text-slate-600">
                                  {Math.round(student.completionPercentage)}%
                                </td>
                                <td className="py-3 text-slate-600">
                                  {student.average === null ? '-' : `${Math.round(student.average)}%`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>

                    <article className="card p-5">
                      <h3 className="text-xl font-bold text-slate-950">Assignment Stats</h3>
                      <div className="mt-4 space-y-3">
                        {report.analytics.assignmentStats.map((assignment) => (
                          <div key={assignment.title} className="rounded-3xl bg-slate-50 p-4">
                            <p className="font-semibold text-slate-950">{assignment.title}</p>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-500">
                              <span>Submitted: {assignment.submittedCount}</span>
                              <span>Graded: {assignment.gradedCount}</span>
                              <span>Avg: {Math.round(assignment.avgScore)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  </section>
                </div>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(courseToDelete)}
        isDanger
        isPending={deleteMutation.isPending}
        title={courseToDelete ? `Delete ${courseToDelete.title}?` : 'Delete course?'}
        message="This will remove all content and enrollments. This cannot be undone."
        confirmLabel="Delete Course"
        onClose={() => {
          if (!deleteMutation.isPending) {
            setCourseToDelete(null);
          }
        }}
        onConfirm={() => deleteMutation.mutate(courseToDelete.id)}
      />
    </AppLayout>
  );
}

export default CoursesManagementPage;

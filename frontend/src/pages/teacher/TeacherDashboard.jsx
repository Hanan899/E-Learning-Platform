import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
} from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import StatCard from '../../components/ui/StatCard';
import { formatDate } from '../../utils/formatters';

const fetchTeacherDashboard = async () => {
  const response = await axiosInstance.get('/teacher/dashboard');
  return response.data.data;
};

const isOlderThanThreeDays = (timestamp) =>
  Date.now() - new Date(timestamp).getTime() > 3 * 24 * 60 * 60 * 1000;

function TeacherDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: fetchTeacherDashboard,
  });

  if (isLoading) {
    return (
      <AppLayout title="Teacher Dashboard">
        <PageLoader label="Loading your dashboard..." />
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout title="Teacher Dashboard">
        <ErrorAlert
          title="We could not load your dashboard"
          message="Please refresh the page and try again."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Teacher Dashboard">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={HiOutlineAcademicCap}
            title="Total Students"
            value={data.totalStats.totalStudents}
            toneClass="bg-primary/10 text-primary"
          />
          <StatCard
            icon={HiOutlineBookOpen}
            title="Active Courses"
            value={data.totalStats.totalCourses}
            toneClass="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={HiOutlineClipboardDocumentList}
            title="Pending Grading"
            value={data.pendingGrading.length}
            toneClass="bg-rose-100 text-rose-600"
          />
          <StatCard
            icon={HiOutlineChartBar}
            title="Avg Completion Rate"
            value={Math.round(data.totalStats.avgCourseCompletion)}
            suffix="%"
            toneClass="bg-amber-100 text-amber-600"
          />
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Pending Grading</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ungraded submissions waiting for your review.
              </p>
            </div>
            {data.pendingGrading.length > 0 ? (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                {data.pendingGrading.length} pending
              </span>
            ) : null}
          </div>

          {data.pendingGrading.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={HiOutlineClipboardDocumentList}
                title="Nothing is waiting for grading"
                description="New student submissions will show up here as soon as they arrive."
              />
            </div>
          ) : (
            <>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Assignment</th>
                    <th className="pb-3 font-medium">Course</th>
                    <th className="pb-3 font-medium">Submitted</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.pendingGrading.map((submission) => (
                    <tr
                      key={submission.id}
                      className={isOlderThanThreeDays(submission.submittedAt) ? 'bg-amber-50/70' : ''}
                    >
                      <td className="py-4 font-medium text-slate-900">{submission.student?.fullName}</td>
                      <td className="py-4 text-slate-600">{submission.assignment?.title}</td>
                      <td className="py-4 text-slate-600">{submission.course?.title}</td>
                      <td className="py-4 text-slate-600">{formatDate(submission.submittedAt)}</td>
                      <td className="py-4 text-right">
                        <Link to={`/teacher/assignments/${submission.assignment?.id}`} className="btn-secondary">
                          Grade Now
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 space-y-4 md:hidden">
              {data.pendingGrading.map((submission) => (
                <article
                  key={submission.id}
                  className={`rounded-3xl border p-4 ${
                    isOlderThanThreeDays(submission.submittedAt)
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <p className="font-semibold text-slate-950">{submission.student?.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">{submission.assignment?.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{submission.course?.title}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Submitted {formatDate(submission.submittedAt)}
                  </p>
                  <Link to={`/teacher/assignments/${submission.assignment?.id}`} className="btn-secondary mt-4 w-full">
                    Grade Now
                  </Link>
                </article>
              ))}
            </div>
            </>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Course Performance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track completion trends and jump into per-course progress details.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {data.courseStats.map((course) => (
                <Link
                  key={course.courseId}
                  to={`/teacher/courses/${course.courseId}/progress`}
                  className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:border-primary/30 hover:bg-white"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{course.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>{course.enrolledCount} enrolled</span>
                        <span>{course.pendingSubmissions} pending submissions</span>
                      </div>
                    </div>
                    <div className="min-w-[220px]">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>Average completion</span>
                        <span>{Math.round(course.avgProgress)}%</span>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-slate-200">
                        <div
                          className="h-3 rounded-full bg-primary"
                          style={{ width: `${Math.min(course.avgProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Live signals from your current classrooms.</p>
              </div>
            </div>

            {data.recentActivity.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={HiOutlineChartBar}
                  title="Activity will appear here soon"
                  description="Once students start submitting work and completing lessons, this live feed will light up."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {data.recentActivity.map((entry, index) => (
                  <div key={`${entry.studentName}-${entry.timestamp}-${index}`} className="flex gap-4">
                    <div className="mt-1 flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      {index !== data.recentActivity.length - 1 ? (
                        <div className="mt-2 h-full w-px bg-slate-200" />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">
                        {entry.studentName} {entry.action} in {entry.course}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default TeacherDashboard;

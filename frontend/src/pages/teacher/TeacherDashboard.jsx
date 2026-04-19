import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import StatCard from '../../components/ui/StatCard';
import { formatDate, formatRelativeTime, getInitials, truncate } from '../../utils/formatters';

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

  const pendingGrading = data.pendingGrading || [];
  const urgentPending = pendingGrading.filter((submission) => isOlderThanThreeDays(submission.submittedAt));
  const gradingPreview = pendingGrading.slice(0, 4);

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
            value={pendingGrading.length}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Pending Grading</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the oldest waiting submissions first, then jump into the full grading workspace.
              </p>
            </div>
            <Link to="/teacher/grading" className="btn-secondary">
              Open grading queue
            </Link>
          </div>

          {pendingGrading.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={HiOutlineClipboardDocumentList}
                title="Nothing is waiting for grading"
                description="New student submissions will show up here as soon as they arrive."
              />
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-500">Total waiting</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{pendingGrading.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-500">Needs attention</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{urgentPending.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Older than 3 days
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-sm text-slate-500">Latest submission</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {pendingGrading[0] ? formatRelativeTime(pendingGrading[0].submittedAt) : 'No items'}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="rounded-xl bg-white p-2 text-amber-600 shadow-sm">
                  <HiOutlineExclamationTriangle className="text-lg" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Recommended next step</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Start with the oldest submissions first to keep turnaround times predictable for students.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Queue Preview</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    A quick look at the next submissions waiting for review.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {pendingGrading.length} pending
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                {gradingPreview.map((submission) => {
                  const isUrgent = isOlderThanThreeDays(submission.submittedAt);

                  return (
                    <article
                      key={submission.id}
                      className={`rounded-3xl border p-4 ${
                        isUrgent
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white font-heading font-bold text-slate-700 shadow-sm">
                              {getInitials(
                                submission.student?.fullName?.split(' ')[0] || '',
                                submission.student?.fullName?.split(' ').slice(1).join(' ') || ''
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">{submission.student?.fullName}</p>
                              <p className="truncate text-sm text-slate-500">{submission.course?.title}</p>
                            </div>
                            {isUrgent ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                Urgent
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-4 text-base font-semibold text-slate-950">
                            {submission.assignment?.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Submitted {formatRelativeTime(submission.submittedAt)} on {formatDate(submission.submittedAt)}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            {truncate(
                              submission.content || 'No written response preview available for this submission.',
                              110
                            )}
                          </p>
                        </div>

                        <Link to={`/teacher/assignments/${submission.assignment?.id}`} className="btn-primary lg:min-w-[128px]">
                          Grade now
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {pendingGrading.length > gradingPreview.length ? (
                <div className="mt-4">
                  <Link to="/teacher/grading" className="btn-secondary">
                    View all {pendingGrading.length} submissions
                  </Link>
                </div>
              ) : null}
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

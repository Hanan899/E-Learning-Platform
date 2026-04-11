import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineStar,
  HiOutlineTrophy,
} from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import CircularProgress from '../../components/ui/CircularProgress';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import StatCard from '../../components/ui/StatCard';
import { getDeadlineState } from '../../utils/assignments';
import { formatDate, formatScore } from '../../utils/formatters';

const fetchDashboard = async () => {
  const response = await axiosInstance.get('/student/dashboard');
  return response.data.data;
};

const getDeadlineBadgeClass = (dueDate) => {
  const state = getDeadlineState(dueDate);

  if (state === 'overdue') {
    return 'bg-rose-100 text-rose-700';
  }

  if (state === 'near') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-emerald-100 text-emerald-700';
};

const getGradeTone = (score, maxScore) => {
  const percentage = maxScore ? (Number(score || 0) / Number(maxScore)) * 100 : 0;

  if (percentage < 50) {
    return 'border-rose-200 text-rose-600';
  }

  if (percentage <= 80) {
    return 'border-amber-200 text-amber-600';
  }

  return 'border-emerald-200 text-emerald-600';
};

function StudentDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: fetchDashboard,
  });

  const upcomingDeadlines = useMemo(
    () => [...(data?.upcomingDeadlines || [])].sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate)),
    [data?.upcomingDeadlines]
  );

  const weeklyActivity = useMemo(
    () =>
      (data?.weeklyActivity || []).map((entry) => ({
        ...entry,
        day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(entry.date)),
      })),
    [data?.weeklyActivity]
  );

  const averageGrade = data?.gradeStats?.averageScore ?? 0;

  if (isLoading) {
    return (
      <AppLayout title="Student Dashboard">
        <PageLoader label="Loading your dashboard..." />
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout title="Student Dashboard">
        <ErrorAlert
          title="We could not load your dashboard"
          message="Please refresh the page and try again."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Student Dashboard">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={HiOutlineBookOpen}
            title="Enrolled Courses"
            value={data.enrolledCourses.length}
            toneClass="bg-primary/10 text-primary"
          />
          <StatCard
            icon={HiOutlineCheckCircle}
            title="Completed Lessons"
            value={data.overallProgress.completed}
            toneClass="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            icon={HiOutlineStar}
            title="Average Grade"
            value={Math.round(averageGrade)}
            suffix="%"
            toneClass="bg-amber-100 text-amber-600"
          />
          <StatCard
            icon={HiOutlineTrophy}
            title="Quizzes Taken"
            value={data.quizStats.attempted}
            toneClass="bg-violet-100 text-violet-600"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">My Courses</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Stay on top of progress and jump back into the next lesson quickly.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {data.enrolledCourses.length}
              </span>
            </div>

            {data.enrolledCourses.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={HiOutlineBookOpen}
                  title="You are not enrolled in any courses yet"
                  description="Once you join a course, your progress and quick links will appear here."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {data.enrolledCourses.map((entry) => (
                  <article
                    key={entry.course.id}
                    className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <HiOutlineAcademicCap className="text-2xl" />
                        </div>
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                            {entry.course.category || 'General'}
                          </p>
                          <h3 className="mt-1 text-xl font-bold">{entry.course.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Teacher: {entry.course.teacher?.fullName || 'Teacher'}
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            Last activity {formatDate(entry.lastActivity)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <CircularProgress
                          percentage={entry.completionPercentage}
                          size={88}
                          color="#10B981"
                          label="Complete"
                        />
                        <Link
                          to={`/student/courses/${entry.course.id}`}
                          className="btn-primary whitespace-nowrap"
                        >
                          Continue
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Upcoming Deadlines</h2>
                <p className="mt-1 text-sm text-slate-500">The next assignments that still need action.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                {upcomingDeadlines.length}
              </span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={HiOutlineClipboardDocumentList}
                  title="Nothing due soon"
                  description="You are in a good spot. Upcoming assignments that still need action will show up here."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <div
                    key={deadline.assignmentId}
                    className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                    data-testid="deadline-item"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-950">{deadline.assignment}</h3>
                        <p className="mt-1 text-sm text-slate-500">{deadline.courseTitle}</p>
                        <p className="mt-2 text-sm text-slate-400">Due {formatDate(deadline.dueDate)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDeadlineBadgeClass(deadline.dueDate)}`}>
                        {getDeadlineState(deadline.dueDate)}
                      </span>
                    </div>
                    <Link
                      to="/student/assignments"
                      className="btn-secondary mt-4 w-full text-center"
                    >
                      Submit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Weekly Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Lessons completed over the last seven days.</p>
              </div>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity}>
                  <XAxis dataKey="day" stroke="#94A3B8" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#94A3B8" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="lessonsCompleted" fill="#10B981" radius={[14, 14, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Recent Grades</h2>
                <p className="mt-1 text-sm text-slate-500">The latest graded work across your courses.</p>
              </div>
            </div>

            {data.recentGrades.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-500">
                Grades will appear here after teachers review your work.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {data.recentGrades.map((grade) => (
                  <article key={`${grade.assignment.id}-${grade.gradedAt}`} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-950">{grade.assignment.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{grade.assignment.courseTitle}</p>
                        <p className="mt-2 text-sm text-slate-400">Updated {formatDate(grade.gradedAt)}</p>
                      </div>
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-sm font-bold ${getGradeTone(
                          grade.score,
                          grade.maxScore
                        )}`}
                      >
                        {Math.round((Number(grade.score || 0) / Number(grade.maxScore || 1)) * 100)}%
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {formatScore(grade.score, grade.maxScore)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default StudentDashboard;

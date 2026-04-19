import { useQuery } from '@tanstack/react-query';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useState } from 'react';
import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import axiosInstance from '../../api/axios';
import StudentReportModal from '../../components/admin/StudentReportModal';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';

const fetchOverview = async () => {
  const response = await axiosInstance.get('/admin/reports/overview');
  return response.data.data;
};

const cardConfig = [
  { key: 'totalUsers', label: 'Total Users', icon: HiOutlineUserGroup, tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'totalStudents', label: 'Active Students', icon: HiOutlineAcademicCap, tone: 'bg-sky-100 text-sky-700' },
  { key: 'totalCourses', label: 'Total Courses', icon: HiOutlineBookOpen, tone: 'bg-primary/10 text-primary' },
  { key: 'totalEnrollments', label: 'Total Enrollments', icon: HiOutlineClipboardDocumentList, tone: 'bg-amber-100 text-amber-700' },
  { key: 'totalSubmissions', label: 'Submissions Received', icon: HiOutlineClipboardDocumentList, tone: 'bg-rose-100 text-rose-700' },
  { key: 'gradedSubmissions', label: 'Graded Submissions', icon: HiOutlineSparkles, tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'avgPlatformScore', label: 'Avg Platform Score', icon: HiOutlineChartBar, tone: 'bg-sky-100 text-sky-700', suffix: '%' },
  { key: 'activeThisWeek', label: 'Active This Week', icon: HiOutlineSparkles, tone: 'bg-violet-100 text-violet-700' },
];

const scoreBandConfig = {
  A: {
    label: 'Excellent',
    range: '90-100%',
    detail: 'High mastery',
    color: '#10b981',
  },
  B: {
    label: 'Strong',
    range: '80-89%',
    detail: 'Above target',
    color: '#14b8a6',
  },
  C: {
    label: 'Satisfactory',
    range: '70-79%',
    detail: 'On track',
    color: '#3b82f6',
  },
  D: {
    label: 'Borderline',
    range: '60-69%',
    detail: 'Needs reinforcement',
    color: '#f59e0b',
  },
  F: {
    label: 'Needs Support',
    range: 'Below 60%',
    detail: 'Intervention needed',
    color: '#ef4444',
  },
};

const enrollmentBarColor = (count) => {
  if (count >= 35) {
    return '#2563eb';
  }
  if (count >= 25) {
    return '#0ea5e9';
  }
  if (count >= 15) {
    return '#14b8a6';
  }
  return '#94a3b8';
};

function ReportsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const overviewQuery = useQuery({
    queryKey: ['admin-reports-overview'],
    queryFn: fetchOverview,
  });

  const data = overviewQuery.data;
  const attentionItems = data?.coursesNeedingAttention || [];
  const topStudents = data?.topStudents || [];
  const enrollmentChartData = [...(data?.enrollmentByCourse || [])]
    .sort((first, second) => second.enrollmentCount - first.enrollmentCount)
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      fill: enrollmentBarColor(entry.enrollmentCount),
    }));
  const topEnrollmentCount = enrollmentChartData[0]?.enrollmentCount || 0;
  const scoreBreakdown = Object.keys(scoreBandConfig).map((grade) => {
    const source = (data?.scoreDistribution || []).find((entry) => entry.grade === grade);
    const config = scoreBandConfig[grade];

    return {
      grade,
      count: source?.count ?? 0,
      ...config,
    };
  });
  const totalEvaluated = scoreBreakdown.reduce((total, entry) => total + entry.count, 0);
  const passingCount = scoreBreakdown
    .filter((entry) => entry.grade !== 'F')
    .reduce((total, entry) => total + entry.count, 0);
  const passRate = totalEvaluated ? Math.round((passingCount / totalEvaluated) * 100) : 0;
  const leadingScoreBand = [...scoreBreakdown].sort((first, second) => second.count - first.count)[0];

  return (
    <AppLayout title="Reports">
      {overviewQuery.isLoading ? (
        <PageLoader label="Loading reports..." />
      ) : overviewQuery.isError ? (
        <ErrorAlert
          title="We could not load reports"
          message="Please refresh the page and try again."
        />
      ) : !data ? (
        <EmptyState
          icon={HiOutlineChartBar}
          title="No report data available"
          description="The platform overview will appear here once the API returns report data."
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cardConfig.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.key} className="card p-5">
                  <div className={`inline-flex rounded-2xl p-3 ${card.tone}`}>
                    <Icon className="text-2xl" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {Math.round(Number(data[card.key] || 0))}
                    {card.suffix ? <span className="ml-1 text-xl text-slate-400">{card.suffix}</span> : null}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="card overflow-hidden p-0">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-primary px-5 py-5 text-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                      Demand Snapshot
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white">Enrollment by Course</h2>
                    <p className="mt-1 text-sm text-white/70">
                      Highest-demand courses based on current student enrollments.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">Most Enrolled</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {enrollmentChartData[0]
                        ? `${enrollmentChartData[0].title} • ${enrollmentChartData[0].enrollmentCount} students`
                        : 'No course data yet'}
                    </p>
                  </div>
                </div>
              </div>

              {enrollmentChartData.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={HiOutlineBookOpen}
                    title="No enrollments yet"
                    description="Course demand will appear here once students start enrolling."
                  />
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid gap-4">
                    {enrollmentChartData.map((entry, index) => {
                      const share = topEnrollmentCount
                        ? Math.max(10, Math.round((entry.enrollmentCount / topEnrollmentCount) * 100))
                        : 0;

                      return (
                        <article
                          key={entry.courseId}
                          className="rounded-3xl border border-slate-100 bg-slate-50/85 px-4 py-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-700 shadow-sm">
                                  #{index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-base font-semibold text-slate-950">
                                    {entry.title}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {entry.enrollmentCount} enrolled students
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span
                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ backgroundColor: `${entry.fill}1A`, color: entry.fill }}
                              >
                                {share}% of top course
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 h-3 rounded-full bg-white">
                            <div
                              className="h-3 rounded-full transition-all"
                              style={{
                                width: `${share}%`,
                                background: `linear-gradient(90deg, ${entry.fill}, ${entry.fill}CC)`,
                              }}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <p className="text-sm text-slate-500">Courses shown</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{enrollmentChartData.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <p className="text-sm text-slate-500">Top course demand</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{topEnrollmentCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                      <p className="text-sm text-slate-500">Total in top list</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">
                        {enrollmentChartData.reduce((total, entry) => total + entry.enrollmentCount, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="card overflow-hidden p-0">
              <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-rose-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Performance Bands
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Score Distribution</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scores grouped by percentage range so the chart reads clearly for admins.
                </p>
              </div>

              {totalEvaluated === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={HiOutlineChartBar}
                    title="No graded results yet"
                    description="Once quizzes and assignments are scored, performance bands will show here."
                  />
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl bg-slate-950 px-4 py-4 text-white">
                      <p className="text-sm text-slate-300">Pass rate</p>
                      <p className="mt-2 text-3xl font-bold">{passRate}%</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-50 px-4 py-4">
                      <p className="text-sm text-emerald-700">Evaluated work</p>
                      <p className="mt-2 text-3xl font-bold text-emerald-950">{totalEvaluated}</p>
                    </div>
                    <div className="rounded-3xl bg-amber-50 px-4 py-4">
                      <p className="text-sm text-amber-700">Largest group</p>
                      <p className="mt-2 text-lg font-bold text-amber-950">{leadingScoreBand.label}</p>
                      <p className="mt-1 text-sm text-amber-800">{leadingScoreBand.range}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {scoreBreakdown.map((entry) => {
                      const percentage = totalEvaluated ? Math.round((entry.count / totalEvaluated) * 100) : 0;

                      return (
                        <div
                          key={entry.grade}
                          className="rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <span
                                  className="h-3.5 w-3.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.label}
                              </span>
                              <p className="mt-1 text-sm text-slate-500">
                                {entry.range} • {entry.detail}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-950">{entry.count}</p>
                              <p className="text-sm text-slate-500">{percentage}%</p>
                            </div>
                          </div>
                          <div className="mt-3 h-2.5 rounded-full bg-white">
                            <div
                              className="h-2.5 rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: entry.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="card p-5">
              <h2 className="text-xl font-bold text-slate-950">User Growth</h2>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.userGrowth}>
                    <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="students" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="teachers" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="card p-5">
              <h2 className="text-xl font-bold text-slate-950">Courses Needing Attention</h2>
              {attentionItems.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={HiOutlineSparkles}
                    title="Everything looks healthy"
                    description="No courses currently meet the alert thresholds."
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {attentionItems.map((item) => (
                    <article key={item.courseId} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-semibold text-amber-950">{item.title}</p>
                      <p className="mt-1 text-sm text-amber-800">{item.teacherName}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-bold text-slate-950">Top Performing Students</h2>
            {topStudents.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={HiOutlineAcademicCap}
                  title="No top students yet"
                  description="Graded work and quiz attempts will populate this ranking."
                />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-slate-400">
                    <tr>
                      <th className="pb-3 font-medium">Rank</th>
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Enrolled Courses</th>
                      <th className="pb-3 font-medium">Avg Grade</th>
                      <th className="pb-3 font-medium">Quizzes Taken</th>
                      <th className="pb-3 font-medium">Overall %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topStudents.map((student, index) => (
                      <tr key={student.id}>
                        <td className="py-3 font-semibold text-slate-900">#{index + 1}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            className="font-semibold text-primary"
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            {student.name}
                          </button>
                        </td>
                        <td className="py-3 text-slate-600">{student.enrolledCourses}</td>
                        <td className="py-3 text-slate-600">{Math.round(student.avgGrade)}%</td>
                        <td className="py-3 text-slate-600">{student.quizzesTaken}</td>
                        <td className="py-3 font-semibold text-slate-900">
                          {Math.round(student.overallPercentage)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <StudentReportModal
        studentId={selectedStudentId}
        isOpen={Boolean(selectedStudentId)}
        onClose={() => setSelectedStudentId(null)}
      />
    </AppLayout>
  );
}

export default ReportsPage;

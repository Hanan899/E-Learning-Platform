import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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

const scoreColors = {
  A: '#10b981',
  B: '#14b8a6',
  C: '#3b82f6',
  D: '#f59e0b',
  F: '#ef4444',
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
            <article className="card p-5">
              <h2 className="text-xl font-bold text-slate-950">Enrollment by Course</h2>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.enrollmentByCourse} layout="vertical" margin={{ left: 20, right: 12 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="title" width={140} tick={{ fill: '#475569', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="enrollmentCount" radius={[0, 12, 12, 0]}>
                      {data.enrollmentByCourse.map((entry) => (
                        <Cell key={entry.courseId} fill={enrollmentBarColor(entry.enrollmentCount)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="card p-5">
              <h2 className="text-xl font-bold text-slate-950">Score Distribution</h2>
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.scoreDistribution} dataKey="count" nameKey="grade" innerRadius={70} outerRadius={105}>
                      {data.scoreDistribution.map((entry) => (
                        <Cell key={entry.grade} fill={scoreColors[entry.grade]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.scoreDistribution.map((entry) => (
                  <div key={entry.grade} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: scoreColors[entry.grade] }} />
                      {entry.grade}
                    </span>
                    <span className="font-semibold text-slate-950">{entry.count}</span>
                  </div>
                ))}
              </div>
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

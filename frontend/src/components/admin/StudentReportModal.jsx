import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HiOutlineXMark } from 'react-icons/hi2';
import axiosInstance from '../../api/axios';
import PageLoader from '../ui/PageLoader';
import ErrorAlert from '../ui/ErrorAlert';
import { formatDate, getInitials } from '../../utils/formatters';

const chartColors = {
  graded: '#10b981',
  submitted: '#f59e0b',
  pending: '#94a3b8',
};

const fetchStudentReport = async ({ queryKey }) => {
  const [, studentId] = queryKey;
  const response = await axiosInstance.get(`/admin/reports/student/${studentId}`);
  return response.data.data;
};

function StudentReportModal({ studentId, isOpen, onClose }) {
  const reportQuery = useQuery({
    queryKey: ['admin-student-report', studentId],
    queryFn: fetchStudentReport,
    enabled: isOpen && Boolean(studentId),
  });

  const data = reportQuery.data;
  const chartData = data
    ? [
        { name: 'Graded', value: data.assignmentStatusBreakdown.graded },
        { name: 'Submitted', value: data.assignmentStatusBreakdown.submitted },
        { name: 'Pending', value: data.assignmentStatusBreakdown.pending },
      ]
    : [];

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[70]">
      <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
          <DialogPanel className="w-full rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Student Report</p>
                <DialogTitle className="mt-2 text-2xl font-bold text-slate-950">
                  {data ? `${data.student.firstName} ${data.student.lastName}` : 'Loading report'}
                </DialogTitle>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                onClick={onClose}
              >
                <HiOutlineXMark className="text-2xl" />
              </button>
            </div>

            {reportQuery.isLoading ? (
              <div className="px-6 py-12">
                <PageLoader label="Loading student report..." />
              </div>
            ) : reportQuery.isError ? (
              <div className="px-6 py-8">
                <ErrorAlert
                  title="We could not load this student report"
                  message="Please try again in a moment."
                />
              </div>
            ) : data ? (
              <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 font-heading text-xl font-bold text-primary">
                        {getInitials(data.student.firstName, data.student.lastName)}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-950">
                          {data.student.firstName} {data.student.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{data.student.email}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Joined {formatDate(data.student.createdAt)} • Overall average {Math.round(data.overallAverage)}%
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="card p-5">
                    <h3 className="text-xl font-bold text-slate-950">Enrollments</h3>
                    <div className="mt-5 grid gap-4">
                      {data.enrollments.map((entry) => (
                        <article key={entry.course.id} className="rounded-3xl border border-slate-100 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-slate-950">{entry.course.title}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {entry.course.category} • Teacher: {entry.course.teacher?.name || 'Unknown'}
                              </p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                              {Math.round(entry.completionPercentage)}%
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(entry.completionPercentage, 100)}%` }}
                            />
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                            <span>Enrolled: {formatDate(entry.enrolledAt)}</span>
                            <span>Completed lessons: {entry.completedLessons}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="card p-5">
                    <h3 className="text-xl font-bold text-slate-950">Grades</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-100 text-slate-400">
                          <tr>
                            <th className="pb-3 font-medium">Course</th>
                            <th className="pb-3 font-medium">Assignment</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.enrollments.flatMap((entry) =>
                            entry.grades.map((grade) => (
                              <tr key={`${entry.course.id}-${grade.assignmentId}`}>
                                <td className="py-3 text-slate-700">{entry.course.title}</td>
                                <td className="py-3 text-slate-700">{grade.title}</td>
                                <td className="py-3 capitalize text-slate-500">
                                  {grade.status.replace('_', ' ')}
                                </td>
                                <td className="py-3 text-slate-700">
                                  {grade.score === null ? '-' : `${grade.score}/${grade.maxScore}`}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="card p-5">
                    <h3 className="text-xl font-bold text-slate-950">Assignment Statuses</h3>
                    <div className="mt-5 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={chartColors[entry.name.toLowerCase()]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-3">
                      {chartData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: chartColors[entry.name.toLowerCase()] }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-semibold text-slate-900">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="card p-5">
                    <h3 className="text-xl font-bold text-slate-950">Quiz Attempts</h3>
                    {data.quizAttempts.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">No quiz attempts recorded yet.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {data.quizAttempts.map((attempt) => (
                          <article key={attempt.id} className="rounded-3xl bg-slate-50 p-4">
                            <p className="font-semibold text-slate-950">{attempt.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{attempt.course?.title || 'Course'}</p>
                            <div className="mt-3 flex items-center justify-between text-sm">
                              <span className="text-slate-500">{formatDate(attempt.completedAt)}</span>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                                {Math.round(attempt.score)}%
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            ) : null}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default StudentReportModal;

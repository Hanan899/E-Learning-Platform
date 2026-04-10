import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import { formatDate } from '../../utils/formatters';

const fetchQuizResults = async (id) => {
  const response = await axiosInstance.get(`/quizzes/${id}/results`);
  return response.data.data;
};

function QuizResultsPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-quiz-results', id],
    queryFn: () => fetchQuizResults(id),
  });

  if (isLoading || !data) {
    return (
      <AppLayout title="Quiz Results">
        <div className="card p-10 text-center text-slate-500">Loading quiz results...</div>
      </AppLayout>
    );
  }

  const { quiz, attempts, stats } = data;

  return (
    <AppLayout title="Quiz Results">
      <div className="space-y-6">
        <section className="card p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">{quiz.course?.title}</p>
          <h2 className="mt-2 text-3xl font-bold">{quiz.title}</h2>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm text-slate-500">Total attempts</p>
            <p className="mt-3 text-3xl font-bold">{stats.totalAttempts}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-3 text-3xl font-bold">{stats.averageScore}%</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Pass rate</p>
            <p className="mt-3 text-3xl font-bold">{stats.passRate}%</p>
          </div>
        </section>

        <section className="card p-6">
          <h3 className="text-xl font-bold">Score distribution</h3>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6">
          <h3 className="text-xl font-bold">Student attempts</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-400">
                <tr>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-4 font-medium text-slate-900">
                      {attempt.student?.firstName} {attempt.student?.lastName}
                    </td>
                    <td className="py-4 text-slate-600">{attempt.score}%</td>
                    <td className="py-4 text-slate-600">{formatDate(attempt.completedAt)}</td>
                    <td className="py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          attempt.score >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {attempt.score >= 60 ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default QuizResultsPage;

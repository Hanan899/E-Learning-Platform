import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import { formatDate, formatScore } from '../../utils/formatters';

const fetchAssignmentDetail = async (id) => {
  const response = await axiosInstance.get(`/assignments/${id}`);
  return response.data.data;
};

function AssignmentDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-assignment-detail', id],
    queryFn: () => fetchAssignmentDetail(id),
  });

  const assignment = data?.assignment;
  const submissions = assignment?.submissions || [];
  const stats = data?.stats || { totalSubmitted: 0, totalGraded: 0, averageScore: 0 };

  const gradingMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.put(`/submissions/${payload.submissionId}/grade`, {
        score: Number(payload.score),
        feedback: payload.feedback,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Submission graded successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignment-detail', id] });
      setSelectedSubmission(null);
      setGradeForm({ score: '', feedback: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to grade submission');
    },
  });

  const averageScoreLabel = useMemo(() => {
    if (!assignment) {
      return '0';
    }

    return `${stats.averageScore}/${assignment.maxScore}`;
  }, [assignment, stats.averageScore]);

  if (isLoading) {
    return (
      <AppLayout title="Assignment Detail">
        <div className="card p-10 text-center text-slate-500">Loading assignment details...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Assignment Detail">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary">
                  {assignment.course?.title}
                </p>
                <h2 className="mt-2 text-3xl font-bold">{assignment.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                  {assignment.description}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right text-sm text-slate-600">
                <p>Due {formatDate(assignment.dueDate)}</p>
                <p className="mt-1">{assignment.maxScore} points</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <p className="text-sm text-slate-500">Total submitted</p>
              <p className="mt-3 text-3xl font-bold">{stats.totalSubmitted}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Total graded</p>
              <p className="mt-3 text-3xl font-bold">{stats.totalGraded}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Average score</p>
              <p className="mt-3 text-3xl font-bold">{averageScoreLabel}</p>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Submissions</h3>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {submissions.length}
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="pb-3 font-medium">Student name</th>
                    <th className="pb-3 font-medium">Submitted at</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="py-4 font-medium text-slate-900">
                        {submission.student?.firstName} {submission.student?.lastName}
                      </td>
                      <td className="py-4 text-slate-600">{formatDate(submission.submittedAt)}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            submission.status === 'graded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {submission.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">
                        {submission.score !== null && submission.score !== undefined
                          ? formatScore(submission.score, assignment.maxScore)
                          : 'Not graded'}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          className="btn-secondary px-4"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setGradeForm({
                              score: submission.score ?? '',
                              feedback: submission.feedback ?? '',
                            });
                          }}
                        >
                          Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="card h-fit p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HiOutlineClipboardDocumentList className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Grading panel</h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedSubmission
                  ? `Scoring ${selectedSubmission.student?.firstName} ${selectedSubmission.student?.lastName}`
                  : 'Select a submission to grade'}
              </p>
            </div>
          </div>

          {selectedSubmission ? (
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                gradingMutation.mutate({
                  submissionId: selectedSubmission.id,
                  score: gradeForm.score,
                  feedback: gradeForm.feedback,
                });
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="grade-score">
                  Score
                </label>
                <input
                  id="grade-score"
                  type="number"
                  min="0"
                  max={assignment.maxScore}
                  className="input"
                  value={gradeForm.score}
                  onChange={(event) => setGradeForm((value) => ({ ...value, score: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="grade-feedback">
                  Feedback
                </label>
                <textarea
                  id="grade-feedback"
                  className="input min-h-[180px] resize-none"
                  value={gradeForm.feedback}
                  onChange={(event) => setGradeForm((value) => ({ ...value, feedback: event.target.value }))}
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={gradingMutation.isPending}>
                {gradingMutation.isPending ? 'Saving grade...' : 'Submit Grade'}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              Choose a student row from the submissions table to open grading controls here.
            </div>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}

export default AssignmentDetailPage;

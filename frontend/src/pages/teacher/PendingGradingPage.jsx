import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import axiosInstance from '../../api/axios';
import GradingDrawer from '../../components/teacher/GradingDrawer';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import { formatRelativeTime, getInitials, truncate } from '../../utils/formatters';

const fetchPendingGrading = async ({ queryKey }) => {
  const [, params] = queryKey;
  const response = await axiosInstance.get('/teacher/pending-grading', { params });
  return response.data.data;
};

const fetchTeacherCourses = async () => {
  const response = await axiosInstance.get('/courses');
  return response.data.data.courses;
};

function PendingGradingPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sort, setSort] = useState('oldest');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const pendingQuery = useQuery({
    queryKey: ['teacher-pending-grading', { courseId: selectedCourseId || undefined, sort }],
    queryFn: fetchPendingGrading,
  });

  const coursesQuery = useQuery({
    queryKey: ['teacher-courses-for-filter'],
    queryFn: fetchTeacherCourses,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, score, feedback }) => {
      const response = await axiosInstance.put(`/submissions/${submissionId}/grade`, {
        score,
        feedback,
      });
      return response.data.data.submission;
    },
    onSuccess: () => {
      toast.success('Grade saved!');
      setSelectedSubmission(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-pending-grading'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-gradebook'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to save grade');
    },
  });

  const pendingData = pendingQuery.data;
  const courses = coursesQuery.data || [];
  const submissions = pendingData?.submissions || [];

  return (
    <AppLayout title="Pending Grading">
      <div className="space-y-6">
        {pendingData?.total > 10 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
            <div className="flex items-center gap-3">
              <HiOutlineExclamationTriangle className="text-2xl" />
              <p className="font-semibold">⚠️ {pendingData.total} submissions awaiting grades</p>
            </div>
          </div>
        ) : null}

        <section className="card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Grade queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review every ungraded submission across your courses and tackle the oldest work first.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="input"
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>

              <select value={sort} onChange={(event) => setSort(event.target.value)} className="input">
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
                <option value="course">By course</option>
              </select>
            </div>
          </div>
        </section>

        {pendingQuery.isLoading ? (
          <PageLoader label="Loading pending submissions..." />
        ) : pendingQuery.isError ? (
          <ErrorAlert
            title="We could not load pending grading"
            message="Please refresh the page and try again."
          />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={HiOutlineClipboardDocumentList}
            title="Nothing is waiting for grading"
            description="Once students submit work that has not been scored yet, it will appear here."
          />
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => {
              const isStale = submission.daysWaiting > 5;

              return (
                <article key={submission.id} className="card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-heading font-bold text-primary">
                          {getInitials(submission.student.firstName, submission.student.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">
                            {submission.student.firstName} {submission.student.lastName}
                          </p>
                          <p className="truncate text-sm text-slate-500">{submission.student.email}</p>
                        </div>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          {submission.course.title}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-bold text-slate-950">{submission.assignment.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {truncate(submission.content || 'No written response provided.', 100)}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className={isStale ? 'font-semibold text-rose-600' : ''}>
                          Submitted {formatRelativeTime(submission.submittedAt)}
                        </span>
                        <span>{submission.daysWaiting} day{submission.daysWaiting === 1 ? '' : 's'} waiting</span>
                        <span>Max score: {submission.assignment.maxScore}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary lg:min-w-36"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      Grade Now
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <GradingDrawer
        key={selectedSubmission?.id || 'pending-grading-drawer'}
        isOpen={Boolean(selectedSubmission)}
        submission={
          selectedSubmission
            ? {
                ...selectedSubmission,
                grade: {
                  score: null,
                  feedback: '',
                },
              }
            : null
        }
        isSubmitting={gradeMutation.isPending}
        onClose={() => {
          if (!gradeMutation.isPending) {
            setSelectedSubmission(null);
          }
        }}
        onSubmit={(values) =>
          gradeMutation.mutateAsync({
            submissionId: selectedSubmission.id,
            ...values,
          })
        }
      />
    </AppLayout>
  );
}

export default PendingGradingPage;

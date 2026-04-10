import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import SubmitAssignmentModal from '../../components/assignments/SubmitAssignmentModal';
import AppLayout from '../../components/layout/AppLayout';
import { getDeadlineBorderClass, sortAssignmentsByDueDate } from '../../utils/assignments';
import { formatDate, formatScore } from '../../utils/formatters';

const fetchStudentAssignments = async () => {
  const courseResponse = await axiosInstance.get('/courses', { params: { limit: 50 } });
  const enrolledCourses = courseResponse.data.data.courses.filter((course) => course.isEnrolled);

  const assignmentsByCourse = await Promise.all(
    enrolledCourses.map(async (course) => {
      const response = await axiosInstance.get(`/courses/${course.id}/assignments`);
      return response.data.data.assignments.map((assignment) => ({
        ...assignment,
        course: {
          id: course.id,
          title: course.title,
          category: course.category,
        },
      }));
    })
  );

  return assignmentsByCourse.flat();
};

function StudentAssignmentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const { data: assignments = [], isLoading, isError, error } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: fetchStudentAssignments,
  });

  const pendingAssignments = useMemo(
    () => sortAssignmentsByDueDate(assignments.filter((assignment) => !assignment.mySubmission)),
    [assignments]
  );
  const submittedAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.mySubmission && assignment.mySubmission.status === 'submitted'
      ),
    [assignments]
  );
  const gradedAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => assignment.mySubmission && assignment.mySubmission.status === 'graded'
      ),
    [assignments]
  );

  const tabs = {
    Pending: pendingAssignments,
    Submitted: submittedAssignments,
    Graded: gradedAssignments,
  };

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, payload }) => {
      const formData = new FormData();
      if (payload.content) {
        formData.append('content', payload.content);
      }
      if (payload.file) {
        formData.append('file', payload.file);
      }

      const response = await axiosInstance.post(`/assignments/${assignmentId}/submit`, formData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Assignment submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to submit assignment');
    },
  });

  const visibleAssignments = tabs[activeTab];

  return (
    <AppLayout title="Assignments">
      <section className="card p-6">
        <div className="flex flex-wrap gap-3">
          {Object.keys(tabs).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="card mt-8 p-10 text-center text-slate-500">Loading assignments...</div>
      ) : isError ? (
        <div className="card mt-8 p-10 text-center text-slate-500">
          {error?.response?.data?.message || 'Unable to load assignments right now.'}
        </div>
      ) : visibleAssignments.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-slate-500">
          No assignments in this tab yet.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {visibleAssignments.map((assignment) => (
            <article
              key={assignment.id}
              className={`card border-l-4 p-5 ${getDeadlineBorderClass(assignment.dueDate)}`}
              data-testid="assignment-card"
              data-status={activeTab.toLowerCase()}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-primary">
                    {assignment.course?.title}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{assignment.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{assignment.description}</p>
                  <p className="mt-4 text-sm text-slate-500">Due {formatDate(assignment.dueDate)}</p>
                </div>

                {activeTab === 'Pending' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    Submit
                  </button>
                ) : null}

                {activeTab === 'Submitted' ? (
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Submitted {formatDate(assignment.mySubmission.submittedAt)}
                  </div>
                ) : null}

                {activeTab === 'Graded' ? (
                  <div className="flex flex-col items-start gap-4 lg:items-end">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700"
                      data-testid="graded-score"
                    >
                      {assignment.mySubmission.score}
                    </div>
                    <div className="max-w-md rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">
                        {formatScore(assignment.mySubmission.score, assignment.maxScore)}
                      </p>
                      <p className="mt-2">{assignment.mySubmission.feedback || 'No feedback yet.'}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <SubmitAssignmentModal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        onSubmit={(payload) =>
          submitMutation.mutateAsync({
            assignmentId: selectedAssignment.id,
            payload,
          })
        }
      />
    </AppLayout>
  );
}

export default StudentAssignmentsPage;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBookOpen } from 'react-icons/hi2';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import GradingDrawer from '../../components/teacher/GradingDrawer';
import AppLayout from '../../components/layout/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import PageLoader from '../../components/ui/PageLoader';
import { getInitials } from '../../utils/formatters';

const fetchGradebook = async ({ queryKey }) => {
  const [, courseId] = queryKey;
  const response = await axiosInstance.get(`/teacher/gradebook/${courseId}`);
  return response.data.data;
};

const getScoreTone = (percentage) => {
  if (percentage >= 80) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (percentage >= 60) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-rose-100 text-rose-700';
};

function GradebookPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const gradebookQuery = useQuery({
    queryKey: ['teacher-gradebook', id],
    queryFn: fetchGradebook,
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
      queryClient.invalidateQueries({ queryKey: ['teacher-gradebook', id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-pending-grading'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to save grade');
    },
  });

  const data = gradebookQuery.data;
  const assignments = data?.assignments || [];
  const students = data?.students || [];

  const assignmentAverages = assignments.map((assignment) => {
    const gradedPercentages = students
      .map((student) => {
        const grade = student.grades[assignment.id];
        if (!grade || grade.status !== 'graded' || grade.score === null) {
          return null;
        }
        return (Number(grade.score) / Number(assignment.maxScore)) * 100;
      })
      .filter((value) => value !== null);

    if (gradedPercentages.length === 0) {
      return null;
    }

    return Math.round(
      gradedPercentages.reduce((total, value) => total + value, 0) / gradedPercentages.length
    );
  });

  return (
    <AppLayout title="Course Gradebook">
      {gradebookQuery.isLoading ? (
        <PageLoader label="Loading gradebook..." />
      ) : gradebookQuery.isError ? (
        <ErrorAlert
          title="We could not load the gradebook"
          message="Please refresh the page and try again."
        />
      ) : !data ? (
        <EmptyState
          icon={HiOutlineBookOpen}
          title="No gradebook data found"
          description="This course is missing or there is no grade data available yet."
        />
      ) : (
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                  {data.course.category || 'Course'}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{data.course.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {students.length} students • Class average {Math.round(data.classAverage || 0)}%
                </p>
              </div>
            </div>
          </section>

          {students.length === 0 ? (
            <EmptyState
              icon={HiOutlineBookOpen}
              title="No enrolled students yet"
              description="As students join the course, their assignment statuses and grades will appear here."
            />
          ) : (
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      <th className="sticky left-0 z-20 min-w-64 border-b border-slate-200 bg-white px-4 py-4 font-semibold text-slate-700">
                        Student
                      </th>
                      {assignments.map((assignment) => (
                        <th
                          key={assignment.id}
                          className="min-w-40 border-b border-slate-200 px-4 py-4 align-bottom font-semibold text-slate-700"
                        >
                          <div>
                            <p>{assignment.title}</p>
                            <p className="mt-1 text-xs font-medium text-slate-400">
                              /{assignment.maxScore}
                            </p>
                          </div>
                        </th>
                      ))}
                      <th className="border-b border-slate-200 px-4 py-4 font-semibold text-slate-700">
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="align-middle">
                        <td className="sticky left-0 z-[1] border-b border-slate-100 bg-white px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 font-heading font-bold text-slate-700">
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">{student.name}</p>
                              <p className="truncate text-sm text-slate-500">{student.email}</p>
                            </div>
                          </div>
                        </td>

                        {assignments.map((assignment) => {
                          const grade = student.grades[assignment.id];

                          if (!grade || grade.status === 'not_submitted') {
                            return (
                              <td key={assignment.id} className="border-b border-slate-100 px-4 py-4 text-center">
                                <span className="text-xl text-slate-300">-</span>
                              </td>
                            );
                          }

                          if (grade.status === 'submitted') {
                            return (
                              <td key={assignment.id} className="border-b border-slate-100 px-4 py-4 text-center">
                                <button
                                  type="button"
                                  className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800"
                                  onClick={() =>
                                    setSelectedSubmission({
                                      id: grade.submissionId,
                                      content: grade.content,
                                      filePath: grade.filePath,
                                      fileUrl: grade.fileUrl,
                                      submittedAt: grade.submittedAt,
                                      student: {
                                        id: student.id,
                                        firstName: student.firstName,
                                        lastName: student.lastName,
                                        email: student.email,
                                      },
                                      course: data.course,
                                      assignment,
                                      grade,
                                    })
                                  }
                                >
                                  Grade
                                </button>
                              </td>
                            );
                          }

                          const percentage = assignment.maxScore
                            ? Math.round((Number(grade.score) / Number(assignment.maxScore)) * 100)
                            : 0;

                          return (
                            <td key={assignment.id} className="border-b border-slate-100 px-4 py-4 text-center">
                              <div
                                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full font-semibold ${getScoreTone(percentage)}`}
                                title={`${grade.score}/${assignment.maxScore}`}
                              >
                                {Math.round(Number(grade.score))}
                              </div>
                            </td>
                          );
                        })}

                        <td className="border-b border-slate-100 px-4 py-4 text-center font-semibold text-slate-700">
                          {student.average === null ? '-' : `${Math.round(student.average)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td className="sticky left-0 z-[1] bg-slate-50 px-4 py-4 font-semibold text-slate-900">
                        Class Average
                      </td>
                      {assignmentAverages.map((average, index) => (
                        <td key={assignments[index].id} className="px-4 py-4 text-center font-semibold text-slate-700">
                          {average === null ? '-' : `${average}%`}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center font-bold text-slate-950">
                        {Math.round(data.classAverage || 0)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      <GradingDrawer
        key={selectedSubmission?.id || 'gradebook-drawer'}
        isOpen={Boolean(selectedSubmission)}
        submission={selectedSubmission}
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

export default GradebookPage;

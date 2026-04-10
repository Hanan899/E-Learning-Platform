import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineClipboardDocumentList, HiOutlinePlus } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import CreateAssignmentModal from '../../components/assignments/CreateAssignmentModal';
import AppLayout from '../../components/layout/AppLayout';
import { getDeadlineBorderClass } from '../../utils/assignments';
import { formatDate } from '../../utils/formatters';

const fetchTeacherAssignments = async () => {
  const courseResponse = await axiosInstance.get('/courses', { params: { limit: 50 } });
  const courses = courseResponse.data.data.courses;

  const groups = await Promise.all(
    courses.map(async (course) => {
      const response = await axiosInstance.get(`/courses/${course.id}/assignments`);
      return {
        course,
        assignments: response.data.data.assignments,
      };
    })
  );

  return {
    courses,
    groups,
  };
};

function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: fetchTeacherAssignments,
  });

  const courses = data?.courses || [];
  const groups = data?.groups || [];
  const totalAssignments = useMemo(
    () => groups.reduce((count, group) => count + group.assignments.length, 0),
    [groups]
  );

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.post(`/courses/${payload.courseId}/assignments`, {
        title: payload.title,
        description: payload.description,
        dueDate: new Date(payload.dueDate).toISOString(),
        maxScore: payload.maxScore,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Assignment created successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to create assignment');
    },
  });

  return (
    <AppLayout title="Assignments">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assignment workflow</h2>
          <p className="mt-1 text-sm text-slate-500">
            Draft, publish, and grade work across all of your active courses.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <HiOutlinePlus className="mr-2 text-lg" />
          Create Assignment
        </button>
      </div>

      {isLoading ? (
        <div className="card mt-8 p-10 text-center text-slate-500">Loading assignments...</div>
      ) : totalAssignments === 0 ? (
        <div className="card mt-8 flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HiOutlineClipboardDocumentList className="text-4xl" />
          </div>
          <h3 className="mt-6 text-2xl font-bold">Create your first assignment</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Pick one of your courses, set a deadline, and students will be notified instantly.
          </p>
          <button type="button" className="btn-primary mt-6" onClick={() => setIsModalOpen(true)}>
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <section key={group.course.id} className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">{group.course.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {group.assignments.length} assignments in this course
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {group.course.category || 'General'}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {group.assignments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    No assignments yet for this course.
                  </div>
                ) : (
                  group.assignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/teacher/assignments/${assignment.id}`}
                      className={`block rounded-2xl border-l-4 bg-slate-50 p-5 transition hover:bg-slate-100 ${getDeadlineBorderClass(
                        assignment.dueDate
                      )}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{assignment.title}</h4>
                          <p className="mt-2 text-sm text-slate-500">{assignment.description}</p>
                        </div>
                        <div className="text-sm text-slate-500 md:text-right">
                          <p>Due {formatDate(assignment.dueDate)}</p>
                          <p className="mt-1">
                            {assignment.submissionCount} submitted / {assignment.enrolledCount} enrolled
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(values) => createAssignmentMutation.mutateAsync(values)}
        courses={courses}
      />
    </AppLayout>
  );
}

export default AssignmentsPage;

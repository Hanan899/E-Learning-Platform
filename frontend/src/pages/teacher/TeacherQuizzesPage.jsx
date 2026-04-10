import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiMiniPlus, HiOutlineQuestionMarkCircle } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';

const fetchTeacherQuizzes = async () => {
  const coursesResponse = await axiosInstance.get('/courses', { params: { limit: 50 } });
  const courses = coursesResponse.data.data.courses;

  const courseGroups = await Promise.all(
    courses.map(async (course) => {
      const courseResponse = await axiosInstance.get(`/courses/${course.id}`);
      return {
        course,
        quizzes: courseResponse.data.data.course.quizzes || [],
      };
    })
  );

  return courseGroups;
};

function TeacherQuizzesPage() {
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['teacher-quizzes'],
    queryFn: fetchTeacherQuizzes,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (course) => {
      const response = await axiosInstance.post(`/courses/${course.id}/quizzes`, {
        title: `${course.title} Quiz ${(course.quizCount || 0) + 1}`,
      });
      return response.data.data.quiz;
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
      window.location.assign(`/teacher/quizzes/${quiz.id}/build`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to create quiz');
    },
  });

  const totalQuizzes = groups.reduce((count, group) => count + group.quizzes.length, 0);

  return (
    <AppLayout title="Quizzes">
      {isLoading ? (
        <div className="card p-10 text-center text-slate-500">Loading quizzes...</div>
      ) : totalQuizzes === 0 ? (
        <div className="card flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HiOutlineQuestionMarkCircle className="text-4xl" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Create your first quiz</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Start from any course to build a timed multiple-choice quiz for your students.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {groups.map(({ course, quizzes }) => (
          <section key={course.id} className="card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary">{course.category || 'General'}</p>
                <h2 className="mt-2 text-2xl font-bold">{course.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{quizzes.length} quizzes in this course</p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => createQuizMutation.mutate({ ...course, quizCount: quizzes.length })}
              >
                <HiMiniPlus className="mr-2 text-lg" />
                Create Quiz
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {quizzes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No quizzes yet for this course.
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{quiz.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {quiz.timeLimit ? `${quiz.timeLimit} minute time limit` : 'No time limit'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/teacher/quizzes/${quiz.id}/build`} className="btn-secondary">
                        Build
                      </Link>
                      <Link to={`/teacher/quizzes/${quiz.id}/results`} className="btn-primary">
                        Results
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}

export default TeacherQuizzesPage;

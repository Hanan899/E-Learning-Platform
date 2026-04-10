import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';
import { formatDate } from '../../utils/formatters';

const fetchStudentQuizzes = async () => {
  const [coursesResponse, attemptsResponse] = await Promise.all([
    axiosInstance.get('/courses', { params: { limit: 50 } }),
    axiosInstance.get('/student/quiz-attempts'),
  ]);

  const enrolledCourses = coursesResponse.data.data.courses.filter((course) => course.isEnrolled);
  const attempts = attemptsResponse.data.data.attempts || [];
  const attemptsByQuizId = new Map(attempts.map((attempt) => [attempt.quiz.id, attempt]));

  const quizzesByCourse = await Promise.all(
    enrolledCourses.map(async (course) => {
      const response = await axiosInstance.get(`/courses/${course.id}`);
      return (response.data.data.course.quizzes || []).map((quiz) => ({
        ...quiz,
        course: {
          id: course.id,
          title: course.title,
          category: course.category,
        },
        attempt: attemptsByQuizId.get(quiz.id) || null,
      }));
    })
  );

  return quizzesByCourse.flat();
};

function StudentQuizzesPage() {
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['student-quizzes-overview'],
    queryFn: fetchStudentQuizzes,
  });

  return (
    <AppLayout title="Quizzes">
      {isLoading ? (
        <div className="card p-10 text-center text-slate-500">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No quizzes available yet.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <article key={quiz.id} className="card p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-primary">{quiz.course?.title}</p>
              <h2 className="mt-3 text-2xl font-bold">{quiz.title}</h2>
              <p className="mt-3 text-sm text-slate-500">
                {quiz.timeLimit ? `${quiz.timeLimit} minute time limit` : 'No time limit'}
              </p>
              {quiz.attempt ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  Completed on {formatDate(quiz.attempt.completedAt)} with a score of {quiz.attempt.score}%
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Ready to start. One attempt is allowed.
                </div>
              )}
              <Link to={`/student/quizzes/${quiz.id}`} className="btn-primary mt-5 w-full text-center">
                {quiz.attempt ? 'View Results' : 'Open Quiz'}
              </Link>
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default StudentQuizzesPage;

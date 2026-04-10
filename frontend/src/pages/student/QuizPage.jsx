import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle } from 'react-icons/hi2';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';

const fetchQuiz = async (id) => {
  const response = await axiosInstance.get(`/quizzes/${id}`);
  return response.data.data;
};

function ResultScreen({ quiz, result }) {
  const isPassed = result.score >= 60;

  return (
    <div className="space-y-6">
      <section className="card p-8 text-center">
        <div
          className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full text-4xl font-bold text-white ${
            isPassed ? 'bg-emerald-500' : 'bg-danger'
          }`}
          data-testid="score-circle"
        >
          {Math.round(result.score)}%
        </div>
        <h2 className="mt-6 text-3xl font-bold">Quiz Results</h2>
        <p className="mt-2 text-slate-500">
          {result.correctCount} out of {result.questionCount} questions correct
        </p>
      </section>

      <section className="space-y-4">
        {result.breakdown.map((entry, index) => (
          <article key={entry.questionId} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Question {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold">{entry.text}</h3>
              </div>
              <span className={entry.isCorrect ? 'text-emerald-600' : 'text-danger'}>
                {entry.isCorrect ? '✓' : '✗'}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-500">Your answer: {entry.selectedOption?.toUpperCase() || 'No answer'}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Correct answer: {entry.correctOption.toUpperCase()}</p>
          </article>
        ))}
      </section>

      <div className="flex justify-end">
        <Link to={`/student/courses/${quiz.courseId}`} className="btn-primary">
          Back to Course
        </Link>
      </div>
    </div>
  );
}

function QuizPage() {
  const { id } = useParams();
  const [phase, setPhase] = useState('pre');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [result, setResult] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['student-quiz', id],
    queryFn: () => fetchQuiz(id),
  });

  const quiz = data?.quiz;
  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (data?.attemptResult) {
      setResult(data.attemptResult);
      setPhase('results');
    }
  }, [data?.attemptResult]);

  const attemptMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.post(`/quizzes/${id}/attempt`, payload);
      return response.data.data.attempt;
    },
    onSuccess: (attempt) => {
      toast.success('Quiz submitted');
      setResult(attempt);
      setPhase('results');
    },
    onError: (error) => {
      const previousAttempt = error.response?.data?.errors;
      if (previousAttempt?.breakdown) {
        setResult(previousAttempt);
        setPhase('results');
        return;
      }

      toast.error(error.response?.data?.message || 'Unable to submit quiz');
    },
  });

  useEffect(() => {
    if (phase !== 'active' || secondsLeft === null) {
      return undefined;
    }

    if (secondsLeft === 60 || secondsLeft === 30) {
      toast(`Time warning: ${secondsLeft} seconds remaining`);
    }

    if (secondsLeft <= 0) {
      setPhase('submitting');
      attemptMutation.mutate({ answers });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [answers, attemptMutation, phase, secondsLeft]);

  const progressPercentage = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const timeLabel =
    secondsLeft === null
      ? 'No limit'
      : `${Math.floor(secondsLeft / 60)
          .toString()
          .padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

  if (isLoading || !quiz) {
    return (
      <AppLayout title="Quiz">
        <div className="card p-10 text-center text-slate-500">Loading quiz...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quiz">
      {phase === 'pre' ? (
        <section className="card p-8" data-testid="pre-quiz-screen">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">{quiz.course?.title}</p>
          <h2 className="mt-3 text-4xl font-bold">{quiz.title}</h2>
          <p className="mt-4 max-w-2xl text-slate-500">
            Answer all questions in one sitting. Your score is graded automatically after submission.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
              {questions.length} questions
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
              {quiz.timeLimit ? `${quiz.timeLimit} minutes` : 'No time limit'}
            </span>
          </div>
          <button
            type="button"
            className="btn-primary mt-8"
            onClick={() => {
              setPhase('active');
              setSecondsLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null);
            }}
          >
            Start Quiz
          </button>
        </section>
      ) : null}

      {phase === 'active' && currentQuestion ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-6">
            <div className="card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <div className="mt-3 h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-primary" style={{ width: `${progressPercentage}%` }} />
                  </div>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-lg font-bold ${
                    secondsLeft !== null && secondsLeft < 60
                      ? 'bg-danger text-white animate-pulse'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  data-testid="quiz-timer"
                >
                  {timeLabel}
                </div>
              </div>
            </div>

            <article className="card p-8">
              <h2 className="text-3xl font-bold">{currentQuestion.text}</h2>
              <div className="mt-6 grid gap-4">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-primary/30'
                      }`}
                      data-testid={`option-card-${option.id}`}
                      onClick={() => setAnswers((value) => ({ ...value, [currentQuestion.id]: option.id }))}
                    >
                      <span>
                        <span className="mr-3 font-bold uppercase">{option.id}</span>
                        {option.text}
                      </span>
                      {isSelected ? <HiCheckCircle className="text-2xl" /> : null}
                    </button>
                  );
                })}
              </div>
            </article>

            <div className="flex justify-between">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
              >
                Previous
              </button>
              {currentIndex === questions.length - 1 ? (
                <button type="button" className="btn-primary" onClick={() => attemptMutation.mutate({ answers })}>
                  Submit Quiz
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!answers[currentQuestion.id]}
                  onClick={() => setCurrentIndex((value) => Math.min(value + 1, questions.length - 1))}
                >
                  Next
                </button>
              )}
            </div>
          </section>

          <aside className="card h-fit p-5">
            <h3 className="text-xl font-bold">Overview</h3>
            <div className="mt-5 grid grid-cols-5 gap-3">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold ${
                    answers[question.id]
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  } ${index === currentIndex ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {phase === 'results' && result ? <ResultScreen quiz={quiz} result={result} /> : null}
    </AppLayout>
  );
}

export default QuizPage;

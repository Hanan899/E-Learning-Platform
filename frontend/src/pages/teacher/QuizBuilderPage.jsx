import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiMiniPlus, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi2';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import AppLayout from '../../components/layout/AppLayout';

const defaultOptions = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
  { id: 'c', text: 'Option C' },
  { id: 'd', text: 'Option D' },
];

const fetchQuiz = async (id) => {
  const response = await axiosInstance.get(`/quizzes/${id}`);
  return response.data.data.quiz;
};

function PreviewModal({ quiz, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="card w-full max-w-3xl p-6 shadow-gentle">
          <DialogTitle className="text-2xl font-bold">Student Preview</DialogTitle>
          <p className="mt-2 text-sm text-slate-500">
            This is how the quiz appears before a student submits.
          </p>
          <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-primary/80">Preview</p>
            <h3 className="mt-3 text-3xl font-bold">{quiz?.title}</h3>
            <p className="mt-2 text-sm text-slate-300">
              {quiz?.questions?.length || 0} questions
              {quiz?.timeLimit ? ` • ${quiz.timeLimit} minutes` : ' • No time limit'}
            </p>
            {(quiz?.questions || []).length > 0 ? (
              <div className="mt-6 max-h-[60vh] space-y-6 overflow-y-auto pr-2">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary/80">
                      Question {index + 1}
                    </p>
                    <p className="mt-3 text-lg font-semibold">{question.text}</p>
                    <div className="mt-4 grid gap-3">
                      {question.options.map((option) => (
                        <div key={option.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                          <span className="mr-2 font-bold uppercase">{option.id}</span>
                          {option.text || 'Option text'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-300">
                Add at least one question to preview the quiz.
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function QuestionEditor({
  question,
  questionIndex,
  questionCount,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onSave,
  onSaveNext,
  onDelete,
}) {
  const [draft, setDraft] = useState(question);

  useEffect(() => {
    setDraft(question);
  }, [question]);

  const activeDraft = draft || question;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question editor</h2>
          <p className="mt-1 text-sm text-slate-500">
            Question {questionIndex + 1} of {questionCount}
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn-secondary" disabled={!canGoPrevious} onClick={onPrevious}>
            Previous Question
          </button>
          <button type="button" className="btn-secondary" disabled={!canGoNext} onClick={onNext}>
            Next Question
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="question-text">
            Question text
          </label>
          <textarea
            id="question-text"
            className="input min-h-[140px] resize-none text-lg"
            value={activeDraft.text || ''}
            onChange={(event) =>
              setDraft((value) => ({ ...(value || question), text: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(activeDraft.options || []).map((option) => (
            <label
              key={option.id}
              className={`rounded-2xl border p-4 ${
                activeDraft.correctOption === option.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-option-${activeDraft.id}`}
                  checked={activeDraft.correctOption === option.id}
                  onChange={() =>
                    setDraft((value) => ({ ...(value || question), correctOption: option.id }))
                  }
                />
                <span className="text-sm font-bold uppercase text-slate-500">{option.id}</span>
              </div>
              <input
                className="mt-3 w-full border-none bg-transparent p-0 text-sm outline-none"
                placeholder={`Option ${option.id.toUpperCase()}`}
                value={option.text}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...(value || question),
                    options: (value?.options || question.options || []).map((entry) =>
                      entry.id === option.id ? { ...entry, text: event.target.value } : entry
                    ),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className="max-w-[160px]">
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="question-points">
            Points
          </label>
          <input
            id="question-points"
            type="number"
            min="1"
            max="10"
            className="input"
            value={activeDraft.points}
            onChange={(event) =>
              setDraft((value) => ({ ...(value || question), points: Number(event.target.value) }))
            }
          />
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className="btn-secondary text-danger" onClick={onDelete}>
            <HiOutlineTrash className="mr-2 text-lg" />
            Delete Question
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                onSave({
                  text: activeDraft.text,
                  options: activeDraft.options,
                  correctOption: activeDraft.correctOption,
                  points: activeDraft.points,
                  order: activeDraft.order,
                })
              }
            >
              Save Question
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                onSaveNext({
                  text: activeDraft.text,
                  options: activeDraft.options,
                  correctOption: activeDraft.correctOption,
                  points: activeDraft.points,
                  order: activeDraft.order,
                })
              }
            >
              Save & Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [quizDraft, setQuizDraft] = useState({ title: '', timeLimit: '' });
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['teacher-quiz', id],
    queryFn: () => fetchQuiz(id),
  });

  const sortedQuestions = useMemo(
    () => [...(quiz?.questions || [])].sort((first, second) => (first.order || 0) - (second.order || 0)),
    [quiz?.questions]
  );

  const selectedQuestion =
    sortedQuestions.find((question) => question.id === selectedQuestionId) || sortedQuestions[0] || null;
  const selectedQuestionIndex = selectedQuestion
    ? sortedQuestions.findIndex((question) => question.id === selectedQuestion.id)
    : -1;

  useEffect(() => {
    if (!selectedQuestionId && sortedQuestions.length > 0) {
      setSelectedQuestionId(sortedQuestions[0].id);
    }
  }, [selectedQuestionId, sortedQuestions]);

  useEffect(() => {
    if (quiz) {
      setQuizDraft({
        title: quiz.title || '',
        timeLimit: quiz.timeLimit || '',
      });
    }
  }, [quiz]);

  const invalidateQuiz = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-quiz', id] });
    queryClient.invalidateQueries({ queryKey: ['teacher-quizzes'] });
  };

  const updateQuizMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.put(`/quizzes/${id}`, payload);
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to save quiz');
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post(`/quizzes/${id}/questions`, {
        text: 'New question',
        options: defaultOptions,
        correctOption: 'a',
        points: 1,
        order: sortedQuestions.length + 1,
      });
      return response.data.data.question;
    },
    onSuccess: (question) => {
      setSelectedQuestionId(question.id);
      invalidateQuiz();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to add question');
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, payload }) => {
      const response = await axiosInstance.put(`/questions/${questionId}`, payload);
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Unable to save question');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId) => {
      await axiosInstance.delete(`/questions/${questionId}`);
    },
    onSuccess: () => {
      setSelectedQuestionId(null);
      invalidateQuiz();
    },
  });

  const reorderQuestion = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= sortedQuestions.length) {
      return;
    }

    const reordered = [...sortedQuestions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    Promise.all(
      reordered.map((question, index) =>
        axiosInstance.put(`/questions/${question.id}`, { order: index + 1 })
      )
    )
      .then(() => invalidateQuiz())
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Unable to reorder questions');
      });
  };

  const handleMoveToQuestion = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= sortedQuestions.length) {
      return;
    }

    setSelectedQuestionId(sortedQuestions[targetIndex].id);
  };

  const saveQuestion = (payload, options = {}) => {
    updateQuestionMutation.mutate(
      { questionId: selectedQuestion.id, payload },
      {
        onSuccess: () => {
          toast.success('Question saved');
          invalidateQuiz();

          if (options.goNext) {
            const nextQuestion = sortedQuestions[selectedQuestionIndex + 1];
            if (nextQuestion) {
              setSelectedQuestionId(nextQuestion.id);
              return;
            }

            addQuestionMutation.mutate();
          }
        },
      }
    );
  };

  if (isLoading || !quiz) {
    return (
      <AppLayout title="Quiz Builder">
        <div className="card p-10 text-center text-slate-500">Loading quiz builder...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Quiz Builder">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex-1">
          <input
            className="w-full border-none bg-transparent p-0 font-heading text-3xl font-bold outline-none"
            value={quizDraft.title}
            onChange={(event) => setQuizDraft((value) => ({ ...value, title: event.target.value }))}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Time limit</label>
            <input
              type="number"
              min="1"
              className="input max-w-[140px]"
              value={quizDraft.timeLimit}
              placeholder="No limit"
              onChange={(event) =>
                setQuizDraft((value) => ({ ...value, timeLimit: event.target.value }))
              }
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setQuizDraft((value) => ({ ...value, timeLimit: '' }))}
            >
              No limit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => setIsPreviewOpen(true)}>
            <HiOutlineEye className="mr-2 text-lg" />
            Preview Quiz
          </button>
          <Link to={`/teacher/quizzes/${id}/results`} className="btn-secondary">
            Results
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              updateQuizMutation.mutate({
                title: quizDraft.title,
                timeLimit: quizDraft.timeLimit ? Number(quizDraft.timeLimit) : null,
              }, {
                onSuccess: () => {
                  toast.success('Quiz published successfully');
                  invalidateQuiz();
                  navigate('/teacher/quizzes');
                },
              })
            }
          >
            Save & Publish
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="card p-4">
          <div>
            <h2 className="text-xl font-bold">Questions</h2>
            <p className="mt-1 text-sm text-slate-500">Use the controls to reorder the quiz flow.</p>
          </div>

          <div className="mt-5 space-y-3">
            {sortedQuestions.map((question, index) => (
              <div
                key={question.id}
                className={`rounded-2xl border p-3 ${
                  selectedQuestion?.id === question.id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <button type="button" className="w-full text-left" onClick={() => setSelectedQuestionId(question.id)}>
                  <p className="text-sm font-semibold text-slate-500">Question {index + 1}</p>
                  <p className="mt-1 line-clamp-2 font-medium text-slate-900">{question.text}</p>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={index === 0}
                    onClick={() => reorderQuestion(index, index - 1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={index === sortedQuestions.length - 1}
                    onClick={() => reorderQuestion(index, index + 1)}
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="btn-primary mt-5 w-full" onClick={() => addQuestionMutation.mutate()}>
            <HiMiniPlus className="mr-2 text-lg" />
            Add Question
          </button>
        </aside>

        <section className="card p-6">
          {selectedQuestion ? (
            <QuestionEditor
              question={selectedQuestion}
              questionIndex={selectedQuestionIndex}
              questionCount={sortedQuestions.length}
              canGoPrevious={selectedQuestionIndex > 0}
              canGoNext={selectedQuestionIndex < sortedQuestions.length - 1}
              onPrevious={() => handleMoveToQuestion(selectedQuestionIndex - 1)}
              onNext={() => handleMoveToQuestion(selectedQuestionIndex + 1)}
              onSave={(payload) => saveQuestion(payload)}
              onSaveNext={(payload) => saveQuestion(payload, { goNext: true })}
              onDelete={() => deleteQuestionMutation.mutate(selectedQuestion.id)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              Create a question to start building the quiz.
            </div>
          )}
        </section>
      </div>

      <PreviewModal quiz={quiz} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </AppLayout>
  );
}

export default QuizBuilderPage;

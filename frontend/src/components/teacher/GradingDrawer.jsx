import { useState } from 'react';
import { HiOutlineArrowTopRightOnSquare, HiOutlineXMark } from 'react-icons/hi2';
import { getInitials } from '../../utils/formatters';
import { resolveAssetUrl } from '../../utils/api';
import Spinner from '../ui/Spinner';

function GradingDrawer({ isOpen, submission, isSubmitting, onClose, onSubmit }) {
  const [score, setScore] = useState(
    submission?.grade?.score !== null && submission?.grade?.score !== undefined
      ? String(submission.grade.score)
      : ''
  );
  const [feedback, setFeedback] = useState(submission?.grade?.feedback || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!submission) {
      return;
    }

    await onSubmit({
      score: Number(score),
      feedback,
    });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/35 transition ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Grade Submission</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {submission ? `${submission.student.firstName} ${submission.student.lastName}` : 'Select a submission'}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
            onClick={onClose}
            aria-label="Close grading panel"
          >
            <HiOutlineXMark className="text-2xl" />
          </button>
        </div>

        {submission ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="space-y-6 overflow-y-auto px-5 py-5">
              <section className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-heading font-bold text-primary">
                    {getInitials(submission.student.firstName, submission.student.lastName)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {submission.student.firstName} {submission.student.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{submission.student.email}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{submission.course.title}</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">{submission.assignment.title}</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    /{submission.assignment.maxScore}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{submission.assignment.description}</p>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Student Response
                  </h3>
                  {submission.fileUrl ? (
                    <a
                      href={resolveAssetUrl(submission.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      Download file
                      <HiOutlineArrowTopRightOnSquare className="text-base" />
                    </a>
                  ) : null}
                </div>
                <div className="max-h-56 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                  {submission.content || 'No written response was provided.'}
                </div>
              </section>

              <section className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Score</span>
                  <div className="relative">
                    <input
                      className="input pr-16 text-lg font-semibold"
                      type="number"
                      min="0"
                      max={submission.assignment.maxScore}
                      step="0.01"
                      required
                      value={score}
                      onChange={(event) => setScore(event.target.value)}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      /{submission.assignment.maxScore}
                    </span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Feedback</span>
                  <textarea
                    className="input min-h-32 resize-y"
                    rows={4}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Share what was strong and what should improve next."
                  />
                </label>
              </section>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-3">
                    <Spinner size="sm" className="border-white/40 border-t-white" />
                    Saving grade...
                  </span>
                ) : (
                  'Submit Grade'
                )}
              </button>
            </div>
          </form>
        ) : null}
      </aside>
    </>
  );
}

export default GradingDrawer;

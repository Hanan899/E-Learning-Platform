import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMemo, useState } from 'react';

function SubmitAssignmentModal({ isOpen, onClose, assignment, onSubmit }) {
  const [response, setResponse] = useState('');
  const [file, setFile] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewName = useMemo(() => file?.name || '', [file]);

  const closeModal = () => {
    setResponse('');
    setFile(null);
    setIsConfirming(false);
    setIsSubmitting(false);
    onClose();
  };

  const handlePrimarySubmit = () => {
    setIsConfirming(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        content: response,
        file,
      });
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={closeModal} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="card w-full max-w-2xl p-6 shadow-gentle">
          <DialogTitle className="text-2xl font-bold">{assignment?.title}</DialogTitle>
          <p className="mt-2 text-sm text-slate-500">{assignment?.description}</p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="submission-response">
                Written response
              </label>
              <textarea
                id="submission-response"
                className="input min-h-[160px] resize-none"
                placeholder="Share your answer, reflection, or steps here..."
                value={response}
                onChange={(event) => setResponse(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Attachment</label>
              <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 hover:border-primary/40 hover:bg-primary/5">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <p className="font-medium text-slate-700">
                  {previewName || 'Drag & drop a file or click to browse'}
                </p>
                <p className="mt-2">PDF, image, or DOCX files up to 10MB.</p>
              </label>
            </div>

            {isConfirming ? (
              <div
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                data-testid="submit-confirmation"
              >
                <p className="font-medium text-slate-900">
                  Are you sure you want to submit? This cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" className="btn-secondary" onClick={() => setIsConfirming(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmedSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handlePrimarySubmit}>
                Submit Assignment
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default SubmitAssignmentModal;

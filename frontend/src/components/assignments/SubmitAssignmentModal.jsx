import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

function SubmitAssignmentModal({ isOpen, onClose, assignment, onSubmit }) {
  const [response, setResponse] = useState('');
  const [file, setFile] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewName = useMemo(() => file?.name || '', [file]);

  const closeModal = () => {
    setResponse('');
    setFile(null);
    setIsConfirmDialogOpen(false);
    setIsSubmitting(false);
    onClose();
  };

  const handlePrimarySubmit = () => {
    setIsConfirmDialogOpen(true);
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
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel className="card h-full w-full max-w-2xl rounded-none p-6 shadow-gentle sm:h-auto sm:rounded-3xl">
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

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handlePrimarySubmit}>
                Submit Assignment
              </button>
            </div>
          </div>

          <ConfirmDialog
            title="Submit assignment?"
            message="Are you sure you want to submit? This cannot be undone."
            confirmLabel="Confirm Submission"
            isOpen={isConfirmDialogOpen}
            isPending={isSubmitting}
            testId="submit-confirmation"
            onClose={() => setIsConfirmDialogOpen(false)}
            onConfirm={handleConfirmedSubmit}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default SubmitAssignmentModal;

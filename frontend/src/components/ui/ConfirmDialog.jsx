import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  isOpen,
  isDanger = false,
  isPending = false,
  testId,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          className="w-full rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-3xl"
          data-testid={testId}
        >
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-3 font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDanger
                  ? 'bg-danger hover:bg-rose-600 focus:ring-danger/30'
                  : 'bg-primary hover:bg-primary-hover focus:ring-primary/30'
              }`}
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? 'Working...' : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;

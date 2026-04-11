import { useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

function ErrorAlert({ title = 'Something went wrong', message, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-danger">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          {message ? <p className="mt-1 text-sm leading-6">{message}</p> : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-danger/80 hover:bg-danger/10 hover:text-danger"
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
          aria-label="Dismiss error"
        >
          <HiOutlineXMark className="text-lg" />
        </button>
      </div>
    </div>
  );
}

export default ErrorAlert;

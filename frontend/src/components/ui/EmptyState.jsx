function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-primary/10"
          fill="none"
          viewBox="0 0 96 96"
        >
          <circle cx="48" cy="48" r="40" fill="currentColor" />
          <path d="M18 58c10-18 50-18 60 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
          {Icon ? <Icon className="text-3xl text-primary" /> : null}
        </div>
      </div>

      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>

      {actionLabel && onAction ? (
        <button type="button" className="btn-primary mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;

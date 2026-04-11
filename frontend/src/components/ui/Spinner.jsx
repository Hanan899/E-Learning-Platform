const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-slate-200 border-t-primary ${sizeMap[size]} ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
}

export default Spinner;

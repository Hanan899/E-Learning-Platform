import Spinner from './Spinner';

function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="card flex min-h-[280px] flex-col items-center justify-center gap-4 p-10 text-center text-slate-500">
      <Spinner size="lg" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export default PageLoader;

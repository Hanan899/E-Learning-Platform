import { Link } from 'react-router-dom';

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-lg p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-danger">Access denied</p>
        <h1 className="mt-4 text-4xl font-extrabold">You do not have permission</h1>
        <p className="mt-4 text-slate-500">
          This section is protected by the role-based access layer.
        </p>
        <Link to="/" className="btn-primary mt-8">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}

export default UnauthorizedPage;

import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-lg p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="mt-4 text-4xl font-extrabold">Page not found</h1>
        <p className="mt-4 text-slate-500">
          The route you tried does not exist in this learning workspace yet.
        </p>
        <Link to="/" className="btn-primary mt-8">
          Go back home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

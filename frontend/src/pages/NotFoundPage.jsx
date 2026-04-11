import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card max-w-2xl p-10 text-center">
        <p className="text-7xl font-black tracking-tight text-primary sm:text-8xl">404</p>
        <h1 className="mt-5 text-4xl font-extrabold">This lesson wandered off</h1>
        <p className="mt-4 text-slate-500">
          The page you were looking for is not here anymore. Let&apos;s get you back to the dashboard
          before attendance is taken.
        </p>
        <Link to="/" className="btn-primary mt-8">
          Go back home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

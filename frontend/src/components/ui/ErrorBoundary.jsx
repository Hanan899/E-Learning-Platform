import { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Application error boundary caught an error', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="card max-w-xl p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">EduFlow</p>
            <h1 className="mt-4 text-4xl font-extrabold">We hit an unexpected issue</h1>
            <p className="mt-4 text-slate-500">
              Refresh the page or jump back to your home dashboard. Your data is still safe.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
                Refresh page
              </button>
              <Link to="/" className="btn-primary">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

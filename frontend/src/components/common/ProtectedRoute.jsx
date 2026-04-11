import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../ui/PageLoader';
import { getDefaultRouteForRole } from '../../utils/auth';

function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-xl px-4">
          <PageLoader label="Loading your workspace..." />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !hasRole(roles)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;

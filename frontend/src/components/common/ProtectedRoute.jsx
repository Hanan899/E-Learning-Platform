import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRouteForRole } from '../../utils/auth';

function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="card px-6 py-5 text-sm text-slate-600">Loading your workspace...</div>
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

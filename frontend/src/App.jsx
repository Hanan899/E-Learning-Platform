import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ComingSoonPage from './pages/shared/ComingSoonPage';
import CourseCatalogPage from './pages/student/CourseCatalogPage';
import CourseViewPage from './pages/student/CourseViewPage';
import StudentDashboard from './pages/student/StudentDashboard';
import CourseEditorPage from './pages/teacher/CourseEditorPage';
import MyCoursesPage from './pages/teacher/MyCoursesPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import { getDefaultRouteForRole } from './utils/auth';

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/courses" element={<ComingSoonPage title="All Courses" />} />
        <Route path="/admin/reports" element={<ComingSoonPage title="Reports" />} />
      </Route>

      <Route element={<ProtectedRoute roles={['teacher']} />}>
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/courses" element={<MyCoursesPage />} />
        <Route path="/teacher/courses/:id/edit" element={<CourseEditorPage />} />
        <Route path="/teacher/assignments" element={<ComingSoonPage title="Assignments" />} />
        <Route path="/teacher/grades" element={<ComingSoonPage title="Grades" />} />
      </Route>

      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/courses" element={<CourseCatalogPage />} />
        <Route path="/student/courses/:id" element={<CourseViewPage />} />
        <Route path="/student/assignments" element={<ComingSoonPage title="Assignments" />} />
        <Route path="/student/quizzes" element={<ComingSoonPage title="Quizzes" />} />
        <Route path="/student/progress" element={<ComingSoonPage title="Progress" />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;

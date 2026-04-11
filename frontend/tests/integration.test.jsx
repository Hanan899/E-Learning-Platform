import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../src/App';
import axiosInstance from '../src/api/axios';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';

const mockedToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}));

const mockedAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  defaults: {
    baseURL: 'http://localhost:5001/api',
  },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

const mockedAxiosLibrary = vi.hoisted(() => ({
  create: vi.fn(() => mockedAxiosInstance),
}));

vi.mock('axios', () => ({
  default: mockedAxiosLibrary,
}));

vi.mock('react-hot-toast', () => ({
  default: mockedToast,
  Toaster: () => null,
}));

const createNotificationResponse = () => ({
  data: {
    data: {
      notifications: [],
      unreadCount: 0,
    },
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  },
});

const setViewport = (width) => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

const renderWithAuth = (route, authValue) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={authValue}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('App Routing', () => {
  beforeEach(() => {
    setViewport(1280);
    mockedAxiosInstance.get.mockReset();
    mockedAxiosInstance.post.mockReset();
    mockedAxiosInstance.put.mockReset();
    mockedToast.error.mockReset();
    mockedToast.success.mockReset();
  });

  test('unauthenticated user is redirected to /login from any protected route', async () => {
    renderWithAuth('/student/dashboard', {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(() => false),
    });

    expect(await screen.findByText('EduFlow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('admin user sees admin dashboard on /', async () => {
    mockedAxiosInstance.get.mockImplementation((url) => {
      if (url === '/admin/stats') {
        return Promise.resolve({
          data: {
            data: {
              totals: {
                usersByRole: { admin: 1, teacher: 2, student: 5 },
                totalCourses: 4,
                totalEnrollments: 9,
                recentSignups: 2,
              },
              recentUsers: [],
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithAuth('/', {
      user: { id: 'admin-1', firstName: 'System', lastName: 'Admin', role: 'admin' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: (roles) => (Array.isArray(roles) ? roles.includes('admin') : roles === 'admin'),
    });

    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  test('student user sees student dashboard on /', async () => {
    mockedAxiosInstance.get.mockImplementation((url) => {
      if (url === '/student/dashboard') {
        return Promise.resolve({
          data: {
            data: {
              enrolledCourses: [],
              recentGrades: [],
              upcomingDeadlines: [],
              quizStats: { attempted: 0, averageScore: 0 },
              overallProgress: { totalLessons: 0, completed: 0 },
              weeklyActivity: [],
              gradeStats: { averageScore: 0, gradedCount: 0 },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithAuth('/', {
      user: { id: 'student-1', firstName: 'Amina', lastName: 'Student', role: 'student' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: (roles) => (Array.isArray(roles) ? roles.includes('student') : roles === 'student'),
    });

    expect(await screen.findByRole('heading', { name: /student dashboard/i })).toBeInTheDocument();
  });

  test('teacher cannot access /admin routes (redirects)', async () => {
    mockedAxiosInstance.get.mockImplementation((url) => {
      if (url === '/teacher/dashboard') {
        return Promise.resolve({
          data: {
            data: {
              courseStats: [],
              pendingGrading: [],
              recentActivity: [],
              totalStats: {
                totalStudents: 0,
                totalCourses: 0,
                avgCourseCompletion: 0,
              },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderWithAuth('/admin/users', {
      user: { id: 'teacher-1', firstName: 'Grace', lastName: 'Teacher', role: 'teacher' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: (roles) => (Array.isArray(roles) ? roles.includes('teacher') : roles === 'teacher'),
    });

    expect(await screen.findByRole('heading', { name: /teacher dashboard/i })).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    mockedToast.error.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('API 500 error shows error toast', async () => {
    const [, onRejected] = mockedAxiosInstance.interceptors.response.use.mock.calls.at(-1);

    await expect(
      onRejected({
        response: {
          status: 500,
          data: { message: 'Server exploded' },
        },
      })
    ).rejects.toBeDefined();

    expect(mockedToast.error).toHaveBeenCalledWith('Server exploded');
  });

  test('network error shows friendly message', async () => {
    const [, onRejected] = mockedAxiosInstance.interceptors.response.use.mock.calls.at(-1);

    await expect(onRejected(new Error('Network down'))).rejects.toBeDefined();

    expect(mockedToast.error).toHaveBeenCalledWith(
      'Network error. Please check your connection and try again.'
    );
  });

  test('401 on expired token redirects to login', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ id: 'student-1', role: 'student' }));
    window.history.replaceState({}, '', '/login');

    mockedAxiosInstance.get.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'Session expired, please login again' },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('EduFlow')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('Responsive', () => {
  beforeEach(() => {
    mockedAxiosInstance.get.mockReset();
    mockedAxiosInstance.get.mockImplementation((url) => {
      if (url === '/student/dashboard') {
        return Promise.resolve({
          data: {
            data: {
              enrolledCourses: [],
              recentGrades: [],
              upcomingDeadlines: [],
              quizStats: { attempted: 0, averageScore: 0 },
              overallProgress: { totalLessons: 0, completed: 0 },
              weeklyActivity: [],
              gradeStats: { averageScore: 0, gradedCount: 0 },
            },
          },
        });
      }

      if (url === '/notifications') {
        return Promise.resolve(createNotificationResponse());
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  afterEach(() => {
    setViewport(1280);
  });

  test('sidebar is hidden on mobile viewport', async () => {
    setViewport(640);

    renderWithAuth('/student/dashboard', {
      user: { id: 'student-1', firstName: 'Amina', lastName: 'Student', role: 'student' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: (roles) => (Array.isArray(roles) ? roles.includes('student') : roles === 'student'),
    });

    await screen.findByRole('heading', { name: /student dashboard/i });
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });

  test('mobile menu button is visible on small screens', async () => {
    setViewport(640);

    renderWithAuth('/student/dashboard', {
      user: { id: 'student-1', firstName: 'Amina', lastName: 'Student', role: 'student' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: (roles) => (Array.isArray(roles) ? roles.includes('student') : roles === 'student'),
    });

    expect(await screen.findByTestId('mobile-menu-button')).toBeInTheDocument();
  });
});

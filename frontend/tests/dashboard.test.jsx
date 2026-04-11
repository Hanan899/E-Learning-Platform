import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CircularProgress from '../src/components/ui/CircularProgress';
import { AuthContext } from '../src/context/AuthContext';
import StudentDashboard from '../src/pages/student/StudentDashboard';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  defaults: {
    baseURL: 'http://localhost:5001/api',
  },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock('../src/api/axios', () => ({
  default: mockedAxios,
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

const renderWithProviders = (ui) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
    {
      wrapper: ({ children }) => (
        <AuthContext.Provider
          value={{
            user: { id: 'student-1', firstName: 'Amina', lastName: 'Student', role: 'student' },
            token: 'token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            hasRole: (roles) => (Array.isArray(roles) ? roles.includes('student') : roles === 'student'),
          }}
        >
          {children}
        </AuthContext.Provider>
      ),
    }
  );

describe('Dashboard pages', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  test('StudentDashboard renders all 4 stat cards', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/student/dashboard') {
        return Promise.resolve({
          data: {
            data: {
              enrolledCourses: [],
              recentGrades: [],
              upcomingDeadlines: [],
              quizStats: { attempted: 5, averageScore: 72 },
              overallProgress: { totalLessons: 40, completed: 25 },
              weeklyActivity: [],
              gradeStats: { averageScore: 84, gradedCount: 3 },
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

    renderWithProviders(<StudentDashboard />);

    expect(await screen.findByText('Enrolled Courses')).toBeInTheDocument();
    expect(screen.getByText('Completed Lessons')).toBeInTheDocument();
    expect(screen.getByText('Average Grade')).toBeInTheDocument();
    expect(screen.getByText('Quizzes Taken')).toBeInTheDocument();
    expect(screen.getAllByTestId('student-stat-card')).toHaveLength(4);
  });

  test('CircularProgress renders correct SVG arc for 75%', async () => {
    vi.useFakeTimers();

    try {
      render(<CircularProgress percentage={75} />);

      await act(async () => {
        vi.runAllTimers();
      });

      const ring = screen.getByTestId('circular-progress-ring');
      const circumference = Number(ring.getAttribute('stroke-dasharray'));
      const dashOffset = Number(ring.getAttribute('stroke-dashoffset'));

      expect(circumference).toBeGreaterThan(0);
      expect(dashOffset).toBeCloseTo(circumference * 0.25, 1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('upcoming deadlines are sorted by date ascending', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/student/dashboard') {
        return Promise.resolve({
          data: {
            data: {
              enrolledCourses: [],
              recentGrades: [],
              upcomingDeadlines: [
                {
                  assignmentId: 'assignment-2',
                  assignment: 'Later deadline',
                  dueDate: '2026-04-20T00:00:00.000Z',
                  courseTitle: 'Science',
                  submitted: false,
                },
                {
                  assignmentId: 'assignment-1',
                  assignment: 'Sooner deadline',
                  dueDate: '2026-04-14T00:00:00.000Z',
                  courseTitle: 'Math',
                  submitted: false,
                },
              ],
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

    renderWithProviders(<StudentDashboard />);

    const items = await screen.findAllByTestId('deadline-item');
    expect(items[0]).toHaveTextContent('Sooner deadline');
    expect(items[1]).toHaveTextContent('Later deadline');
  });
});

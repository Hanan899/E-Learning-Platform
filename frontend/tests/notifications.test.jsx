import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import NotificationBell from '../src/components/layout/NotificationBell';
import { AuthContext } from '../src/context/AuthContext';
import { useNotifications } from '../src/hooks/useNotifications';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
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
        <MemoryRouter>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

const notificationsPayload = {
  data: {
    data: {
      notifications: [
        {
          id: 'notification-1',
          title: 'Assignment graded',
          message: 'Assignment graded: 85/100',
          type: 'grade',
          isRead: false,
          createdAt: '2026-04-11T10:00:00.000Z',
        },
      ],
      unreadCount: 3,
    },
    pagination: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  },
};

describe('Notifications UI', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
  });

  test('NotificationBell shows badge with correct count', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve(notificationsPayload);
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 3 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    render(<NotificationBell />, { wrapper: createWrapper() });

    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('3');
  });

  test('clicking notification marks it as read', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve(notificationsPayload);
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 1 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    mockedAxios.put.mockResolvedValue({
      data: {
        data: {
          notification: {
            id: 'notification-1',
            isRead: true,
          },
        },
      },
    });

    render(<NotificationBell />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole('button', { name: /open notifications/i }));
    await userEvent.click(await screen.findByText('Assignment graded'));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/notifications/notification-1/read');
    });
  });

  test('empty state message shown when no notifications', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve({
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
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    render(<NotificationBell />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole('button', { name: /open notifications/i }));
    expect(await screen.findByText("You're all caught up!")).toBeInTheDocument();
  });

  test('useNotifications hook polls every 30 seconds', async () => {
    vi.useFakeTimers();
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/notifications') {
        return Promise.resolve(notificationsPayload);
      }

      if (url === '/notifications/count') {
        return Promise.resolve({ data: { data: { unreadCount: 3 } } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    try {
      renderHook(() => useNotifications(), { wrapper: createWrapper() });

      await act(async () => {
        await Promise.resolve();
      });

      const initialCountCalls = mockedAxios.get.mock.calls.filter(([url]) => url === '/notifications/count');
      expect(initialCountCalls.length).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
      });

      const countCalls = mockedAxios.get.mock.calls.filter(([url]) => url === '/notifications/count');
      expect(countCalls.length).toBeGreaterThan(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

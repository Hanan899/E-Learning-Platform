import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../src/context/AuthContext';
import UsersPage from '../src/pages/admin/UsersPage';

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
      <MemoryRouter initialEntries={['/admin/users']}>
        <AuthContext.Provider
          value={{
            user: { id: 'admin-1', firstName: 'System', lastName: 'Admin', role: 'admin' },
            token: 'token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            hasRole: (roles) => (Array.isArray(roles) ? roles.includes('admin') : roles === 'admin'),
          }}
        >
          {ui}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Admin users page', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
  });

  test('All roles filter does not send an empty role param', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/admin/users') {
        return Promise.resolve({
          data: {
            data: {
              users: [
                {
                  id: 'user-1',
                  firstName: 'System',
                  lastName: 'Admin',
                  email: 'admin@school.com',
                  role: 'admin',
                  isActive: true,
                  createdAt: '2026-04-10T00:00:00.000Z',
                },
              ],
            },
            pagination: {
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
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

    renderWithProviders(<UsersPage />);

    expect((await screen.findAllByText('admin@school.com')).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 1, limit: 10 },
      });
    });
  });

  test('admin can permanently delete a user from the action menu', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/admin/users') {
        return Promise.resolve({
          data: {
            data: {
              users: [
                {
                  id: 'user-1',
                  firstName: 'Mia',
                  lastName: 'Moore',
                  email: 'mia@student.edu',
                  role: 'student',
                  isActive: true,
                  createdAt: '2026-04-10T00:00:00.000Z',
                },
              ],
            },
            pagination: {
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
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
    mockedAxios.delete.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<UsersPage />);

    expect((await screen.findAllByText('mia@student.edu')).length).toBeGreaterThan(0);

    const actionButtons = screen.getAllByRole('button', { name: /open actions for mia moore/i });

    await userEvent.click(actionButtons[actionButtons.length - 1]);
    await userEvent.click(await screen.findByText(/delete permanently/i));
    await userEvent.click(screen.getByRole('button', { name: /^delete permanently$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/admin/users/user-1', {
        data: { confirm: true },
      });
    });
  });
});

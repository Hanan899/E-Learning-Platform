import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../src/context/AuthContext';
import UsersPage from '../src/pages/admin/UsersPage';

const mockedAxios = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
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
  });

  test('All roles filter does not send an empty role param', async () => {
    mockedAxios.get.mockResolvedValueOnce({
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

    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('admin@school.com')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 1, limit: 10 },
      });
    });
  });
});

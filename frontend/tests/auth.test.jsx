import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProtectedRoute from '../src/components/common/ProtectedRoute';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';
import LoginPage from '../src/pages/auth/LoginPage';
import RegisterPage from '../src/pages/auth/RegisterPage';

const mockedAxios = vi.hoisted(() => ({
  defaults: {
    baseURL: 'http://localhost:5001/api',
  },
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(() => Promise.reject(new Error('Unauthorized'))),
  post: vi.fn(),
}));

vi.mock('../src/api/axios', () => ({
  default: mockedAxios,
}));

const createWrapper = (children) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('Authentication UI', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
    mockedAxios.get.mockImplementation(() => Promise.reject(new Error('Unauthorized')));
  });

  test('login form shows error on invalid credentials', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Invalid email or password' },
      },
    });

    render(
      createWrapper(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      )
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'teacher@school.com');
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'wrong-password');
    await userEvent.click(submitButton);

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  test('ProtectedRoute redirects unauthenticated users to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AuthContext.Provider
                value={{
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                  login: vi.fn(),
                  register: vi.fn(),
                  logout: vi.fn(),
                  hasRole: vi.fn(() => false),
                }}
              >
                <ProtectedRoute>
                  <div>Protected content</div>
                </ProtectedRoute>
              </AuthContext.Provider>
            }
          />
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  test('password strength indicator updates as user types', async () => {
    render(
      createWrapper(
        <AuthContext.Provider
          value={{
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            hasRole: vi.fn(() => false),
          }}
        >
          <RegisterPage />
        </AuthContext.Provider>
      )
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    await userEvent.type(passwordInput, 'abc');
    expect(screen.getByTestId('password-strength')).toHaveTextContent('Weak');

    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'Password1!');
    expect(screen.getByTestId('password-strength')).toHaveTextContent('Strong');
  });
});

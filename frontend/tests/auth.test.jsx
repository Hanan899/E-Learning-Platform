import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProtectedRoute from '../src/components/common/ProtectedRoute';
import { AuthProvider } from '../src/context/AuthContext';
import { AuthContext } from '../src/context/auth-context';
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

  test('register form submits selected teacher role and redirects to teacher dashboard', async () => {
    const registerMock = vi.fn().mockResolvedValue({
      id: 'teacher-1',
      role: 'teacher',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/register']}>
          <AuthContext.Provider
            value={{
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              login: vi.fn(),
              register: registerMock,
              logout: vi.fn(),
              hasRole: vi.fn(() => false),
            }}
          >
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/teacher/dashboard" element={<div>Teacher dashboard</div>} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByLabelText(/first name/i), 'Taylor');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Instructor');
    await userEvent.type(screen.getByLabelText(/email/i), 'taylor@school.com');
    await userEvent.click(screen.getByRole('radio', { name: /teacher/i }));
    await userEvent.type(screen.getByLabelText(/^password$/i), 'Teacher1234');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Teacher1234');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        firstName: 'Taylor',
        lastName: 'Instructor',
        email: 'taylor@school.com',
        role: 'teacher',
        password: 'Teacher1234',
      });
    });

    expect(await screen.findByText('Teacher dashboard')).toBeInTheDocument();
  });
});

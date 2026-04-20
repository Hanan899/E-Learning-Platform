import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import axiosInstance from '../src/api/axios';
import { AuthProvider } from '../src/context/AuthContext';
import { AuthContext } from '../src/context/auth-context';

function TestComponent() {
  return (
    <AuthContext.Consumer>
      {({ user }) => <div data-testid="user">{JSON.stringify(user)}</div>}
    </AuthContext.Consumer>
  );
}

describe('Frontend setup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('axios instance has correct baseURL', () => {
    expect(axiosInstance.defaults.baseURL).toContain('localhost:5001');
  });

  test('AuthContext provides user as null initially', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });
});

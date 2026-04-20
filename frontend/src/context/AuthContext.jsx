import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import { AuthContext } from './auth-context';

const storageKeys = ['token', 'user'];

const getPersistedSession = () => {
  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');

  return {
    token,
    user: rawUser ? JSON.parse(rawUser) : null,
    rememberMe: Boolean(localStorage.getItem('token')),
  };
};

const clearSession = () => {
  storageKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const writeSession = ({ token, user, rememberMe }) => {
  clearSession();

  if (!token || !user) {
    return;
  }

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(user));
};

const areUsersEqual = (firstUser, secondUser) =>
  JSON.stringify(firstUser || null) === JSON.stringify(secondUser || null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getPersistedSession);

  const persistSession = (nextToken, nextUser, rememberMe = true) => {
    const nextSession = {
      token: nextToken,
      user: nextUser,
      rememberMe,
    };

    writeSession(nextSession);
    setSession(nextSession);
  };

  const logout = () => {
    clearSession();
    setSession({
      token: null,
      user: null,
      rememberMe: false,
    });
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
  };

  const meQuery = useQuery({
    queryKey: ['auth', 'me', session.token],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        return response.data.data.user;
      } catch (error) {
        clearSession();
        setSession({
          token: null,
          user: null,
          rememberMe: false,
        });
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });
        throw error;
      }
    },
    enabled: Boolean(session.token),
    retry: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: session.user ?? undefined,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await axiosInstance.post('/auth/login', { email, password });
      return response.data.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await axiosInstance.post('/auth/register', payload);
      return response.data.data;
    },
  });

  useEffect(() => {
    if (!session.token || !meQuery.data || areUsersEqual(session.user, meQuery.data)) {
      return;
    }

    writeSession({
      token: session.token,
      user: meQuery.data,
      rememberMe: session.rememberMe,
    });
  }, [meQuery.data, session.rememberMe, session.token, session.user]);

  const login = async (email, password, options = {}) => {
    const authData = await loginMutation.mutateAsync({ email, password });
    const rememberMe = options.rememberMe ?? true;

    persistSession(authData.token, authData.user, rememberMe);
    queryClient.setQueryData(['auth', 'me', authData.token], authData.user);

    return authData.user;
  };

  const register = async (payload) => {
    const authData = await registerMutation.mutateAsync(payload);
    const rememberMe = payload.rememberMe ?? true;

    persistSession(authData.token, authData.user, rememberMe);
    queryClient.setQueryData(['auth', 'me', authData.token], authData.user);

    return authData.user;
  };

  const user = meQuery.data || session.user;
  const token = session.token;
  const isLoading =
    loginMutation.isPending ||
    registerMutation.isPending ||
    (Boolean(token) && meQuery.isPending);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    hasRole: (role) =>
      Array.isArray(role) ? role.includes(user?.role) : user?.role === role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext, useEffect, useState } from 'react';
import axiosInstance from '../api/axios';

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

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }) {
  const initialSession = getPersistedSession();
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const [isLoading, setIsLoading] = useState(Boolean(initialSession.token));

  const persistSession = (nextToken, nextUser, rememberMe = true) => {
    clearSession();
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem('token', nextToken);
    storage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const login = async (email, password, options = {}) => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    const nextToken = response.data.data.token;
    const nextUser = response.data.data.user;

    persistSession(nextToken, nextUser, options.rememberMe ?? true);

    return nextUser;
  };

  const register = async (payload) => {
    const response = await axiosInstance.post('/auth/register', payload);
    return response.data.data.user;
  };

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get('/auth/me');
        const nextUser = response.data.data.user;
        const rememberMe = Boolean(localStorage.getItem('token'));
        persistSession(token, nextUser, rememberMe);
      } catch (_error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

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

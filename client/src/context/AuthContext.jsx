import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tm_token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('tm_token'));

  const persist = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    if (nextToken) localStorage.setItem('tm_token', nextToken);
    else localStorage.removeItem('tm_token');
    if (nextUser) localStorage.setItem('tm_user', JSON.stringify(nextUser));
    else localStorage.removeItem('tm_user');
  };

  const loadUser = useCallback(async () => {
    if (!localStorage.getItem('tm_token')) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authService.me();
      setUser(data.data);
      localStorage.setItem('tm_user', JSON.stringify(data.data));
    } catch {
      persist(null, null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authService.login({ email, password });
    const { token: t, ...rest } = data.data;
    persist(rest, t);
    return rest;
  };

  const register = async (name, email, password) => {
    const { data } = await authService.register({ name, email, password });
    const { token: t, ...rest } = data.data;
    persist(rest, t);
    return rest;
  };

  const logout = () => persist(null, null);

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('tm_user', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      updateUser,
      refreshUser: loadUser,
    }),
    [user, token, loading, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

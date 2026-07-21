import { createContext, useState, useCallback } from 'react';
import * as authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem('erp_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: u } = await authApi.login(email, password);
      sessionStorage.setItem('erp_token', token);
      sessionStorage.setItem('erp_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem('erp_token');
    sessionStorage.removeItem('erp_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

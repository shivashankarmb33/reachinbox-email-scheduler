import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  devLogin: (email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth token from storage or URL parameter (Google OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('reachinbox_token', urlToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${urlToken}`;
      // Clean up token from address bar
      params.delete('token');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, document.title, newUrl);
    } else {
      const storedToken = localStorage.getItem('reachinbox_token');
      if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      // Remove invalid token if present
      localStorage.removeItem('reachinbox_token');
      delete apiClient.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const loginWithGoogle = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const devLogin = async (email = 'demo@reachinbox.ai', name = 'ReachInbox Demo User') => {
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/dev-login', { email, name });
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('reachinbox_token', res.data.token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        }
        setUser(res.data.user);
      } else {
        throw new Error(res.data.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('reachinbox_token');
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        devLogin,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

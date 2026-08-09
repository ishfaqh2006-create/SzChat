import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { getSocket, disconnectSocket } from '../lib/socketClient.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  register: (username: string, displayName: string, pass: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('szchat_token'));
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('szchat_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!user && !!token);

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        setUser(null);
        localStorage.removeItem('szchat_user');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('szchat_user', JSON.stringify(data.user));
          getSocket(token); // Connect Socket.IO
        } else if (res.status === 401 || res.status === 403) {
          logout();
        }
      } catch (err) {
        console.warn('Auth verification network delay/error, keeping cached session:', err);
        // Connect socket anyway with token
        if (token) getSocket(token);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  const login = async (username: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('szchat_token', data.token);
    localStorage.setItem('szchat_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    getSocket(data.token);
  };

  const register = async (username: string, displayName: string, pass: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, password: pass }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('szchat_token', data.token);
    localStorage.setItem('szchat_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    getSocket(data.token);
  };

  const logout = () => {
    localStorage.removeItem('szchat_token');
    localStorage.removeItem('szchat_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!token) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update profile');
    }

    setUser(result.user);
    localStorage.setItem('szchat_user', JSON.stringify(result.user));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

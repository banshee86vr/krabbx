import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { authApiLogout, setCsrfToken } from '../services/api';

function authStatusUrl(): string {
  const base = import.meta.env.VITE_API_URL;
  if (base) {
    return `${String(base).replace(/\/$/, '')}/api/auth/status`;
  }
  return '/api/auth/status';
}

interface User {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch(authStatusUrl(), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data.csrfToken === 'string') {
          setCsrfToken(data.csrfToken);
        }
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApiLogout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    // Synchronizing with the server's auth session on mount; there is no
    // render-time equivalent for this external system check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


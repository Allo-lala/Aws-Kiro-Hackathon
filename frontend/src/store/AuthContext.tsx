import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async () => {
    try {
      const profile = await userService.getProfile();
      setUser({
        id: profile.id,
        email: profile.email,
        emailVerified: profile.emailVerified,
        isActive: profile.isActive,
        isAdmin: profile.isAdmin,
      });
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      const { user: userData, token: authToken, refreshToken } = response;
      
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('auth_token', authToken);
      
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 403) {
        throw new Error(error.response.data.message || 'Account is locked');
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await authService.register({ email, password });
      // Registration successful - user needs to verify email
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid registration data');
      } else if (error.response?.status === 409) {
        throw new Error('Email already exists');
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    // Call backend to invalidate session
    if (token) {
      authService.logout().catch(() => {
        // Ignore errors on logout
      });
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authService.verifyEmail(verificationToken);
    } catch (error: any) {
      throw new Error('Email verification failed. The link may be invalid or expired.');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    verifyEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

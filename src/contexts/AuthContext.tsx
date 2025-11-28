import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import axios from 'axios';

// Configure axios defaults
// Configure axios defaults
// Use dynamic hostname to allow mobile connection
axios.defaults.baseURL = `http://${window.location.hostname}:5000/api`;
axios.defaults.withCredentials = true;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: User['role']) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  sendLoginOTP: (email: string) => Promise<void>;
  verifyLoginOTP: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  loading: boolean; // For initial app load
  apiLoading: boolean; // For login/register actions
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Initial load
  const [apiLoading, setApiLoading] = useState(false); // API operations

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user.assignedVehicleId) {
        localStorage.setItem('assignedVehicleId', user.assignedVehicleId);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setApiLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: User['role']) => {
    setApiLoading(true);
    try {
      await axios.post('/auth/register', { email, password, name, role });
      // Don't set user here, wait for OTP verification
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setApiLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      await axios.post('/auth/verify-otp', { email, otp });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setApiLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post('/auth/resend-otp', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setApiLoading(false);
    }
  };

  const sendLoginOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post('/auth/send-login-otp', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send login OTP');
    } finally {
      setApiLoading(false);
    }
  };

  const verifyLoginOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post('/auth/verify-login-otp', { email, otp });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user.assignedVehicleId) {
        localStorage.setItem('assignedVehicleId', user.assignedVehicleId);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login OTP verification failed');
    } finally {
      setApiLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('assignedVehicleId');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, verifyOTP, resendOTP, sendLoginOTP, verifyLoginOTP, logout, loading, apiLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
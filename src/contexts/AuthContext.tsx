import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { User } from "../types";
import { API_URL } from "../config";

// Point axios directly to your Render backend API
axios.defaults.baseURL = `${API_URL}/api`;
axios.defaults.withCredentials = true;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role: User["role"]
  ) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  sendLoginOTP: (email: string) => Promise<void>;
  verifyLoginOTP: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  apiLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const persistUser = (token: string, rawUser: any) => {
    const normalizedUser: User = {
      id: rawUser.id,
      email: rawUser.email,
      role: rawUser.role,
      name: rawUser.name,
      assignedVehicle: rawUser.assignedVehicleId || null,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("userId", normalizedUser.id);

    if (normalizedUser.assignedVehicle) {
      localStorage.setItem("assignedVehicleId", normalizedUser.assignedVehicle);
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(normalizedUser);
  };

  // LOGIN
  const login = async (email: string, password: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post(`/auth/login`, { email, password });
      const { token, user } = res.data;
      persistUser(token, user);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Login failed");
    } finally {
      setApiLoading(false);
    }
  };

  // REGISTER
  const register = async (
    email: string,
    password: string,
    name: string,
    role: User["role"]
  ) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/register`, { email, password, name, role });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Registration failed");
    } finally {
      setApiLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/verify-otp`, { email, otp });
    } finally {
      setApiLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/resend-otp`, { email });
    } finally {
      setApiLoading(false);
    }
  };

  const sendLoginOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/send-login-otp`, { email });
    } finally {
      setApiLoading(false);
    }
  };

  const verifyLoginOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post(`/auth/verify-login-otp`, { email, otp });
      const { token, user } = res.data;
      persistUser(token, user);
    } finally {
      setApiLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyOTP,
        resendOTP,
        sendLoginOTP,
        verifyLoginOTP,
        logout,
        loading,
        apiLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

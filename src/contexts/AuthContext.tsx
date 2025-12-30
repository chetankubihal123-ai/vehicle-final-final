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
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPass: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadProfilePic: (file: File) => Promise<void>;
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
      assignedVehicleDetails: rawUser.assignedVehicle || null,
      profilePic: rawUser.profilePic,
      phone: rawUser.phone,
      dob: rawUser.dob,
      address: rawUser.address,
      gender: rawUser.gender,
      driverStatus: rawUser.driverStatus,
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

  // PASSWORD LOGIN
  const login = async (email: string, password: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post(
        `/auth/login`,
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
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
      await axios.post(
        `/auth/register`,
        { email, password, name, role },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Registration failed");
    } finally {
      setApiLoading(false);
    }
  };

  // VERIFY OTP AFTER REGISTER
  const verifyOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      await axios.post(
        `/auth/verify-otp`,
        { email, otp },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setApiLoading(false);
    }
  };

  // RESEND OTP (REGISTER)
  const resendOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post(
        `/auth/resend-otp`,
        { email },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setApiLoading(false);
    }
  };

  // SEND OTP FOR LOGIN
  const sendLoginOTP = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post(
        `/auth/send-login-otp`,
        { email },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setApiLoading(false);
    }
  };

  // VERIFY OTP FOR LOGIN
  const verifyLoginOTP = async (email: string, otp: string) => {
    setApiLoading(true);
    try {
      const res = await axios.post(
        `/auth/verify-login-otp`,
        { email, otp },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const { token, user } = res.data;
      persistUser(token, user);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setApiLoading(false);
    }
  };

  // FORGOT PASSWORD
  const forgotPassword = async (email: string) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/forgot-password`, { email });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to send reset code");
    } finally {
      setApiLoading(false);
    }
  };

  // RESET PASSWORD
  const resetPassword = async (email: string, otp: string, newPass: string) => {
    setApiLoading(true);
    try {
      await axios.post(`/auth/reset-password`, {
        email,
        otp,
        newPassword: newPass,
      });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Reset failed");
    } finally {
      setApiLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateProfile = async (data: Partial<User>) => {
    setApiLoading(true);
    try {
      const res = await axios.put(`/auth/profile`, data);
      const updatedUser = { ...user, ...res.data.user } as User;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Update profile failed");
    } finally {
      setApiLoading(false);
    }
  };

  const uploadProfilePic = async (file: File) => {
    setApiLoading(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      const res = await axios.post(`/auth/profile-pic`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedUser = { ...user, profilePic: res.data.profilePic } as User;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Upload failed");
    } finally {
      setApiLoading(false);
    }
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
        forgotPassword,
        resetPassword,
        logout,
        updateProfile,
        uploadProfilePic,
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

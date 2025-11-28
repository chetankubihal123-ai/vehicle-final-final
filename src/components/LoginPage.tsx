import React, { useState, useEffect } from "react";
import { Car, User, Building, Truck, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, register, verifyOTP, resendOTP, sendLoginOTP, verifyLoginOTP, apiLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isOtpLogin, setIsOtpLogin] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "personal" as "personal" | "fleet_owner" | "driver",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);

  // Registration OTP State
  const [awaitingRegistrationOtp, setAwaitingRegistrationOtp] = useState(false);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Timer countdown effect
  useEffect(() => {
    if (timer <= 0) return;

    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(countdown);
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      if (isLogin) {
        if (isOtpLogin) {
          if (otpSent) {
            await verifyLoginOTP(formData.email, otp);
          } else {
            await sendLoginOTP(formData.email);
            setOtpSent(true);
            setTimer(600);
            setSuccess("OTP sent to your email.");
          }
        } else {
          await login(formData.email, formData.password);
        }
      } else {
        if (awaitingRegistrationOtp) {
          // Verify OTP for registration
          await verifyOTP(formData.email, otp);
          setSuccess("Email verified! Please login.");
          setAwaitingRegistrationOtp(false);
          setIsLogin(true);
          setOtp("");
        } else {
          // Register
          await register(
            formData.email,
            formData.password,
            formData.name,
            formData.role
          );
          setAwaitingRegistrationOtp(true);
          setSuccess("Registration successful! Please enter the OTP sent to your email.");
          setTimer(600); // 10 minutes
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const demoCredentials = [
    { email: "owner@fleet.com", role: "Fleet Owner", icon: Building },
    { email: "driver@fleet.com", role: "Driver", icon: Truck },
    { email: "personal@user.com", role: "Personal User", icon: User },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #4C1D95, #5B21B6, #6D28D9, #7C3AED)",
      }}
    >
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/20 backdrop-blur-xl shadow-2xl rounded-3xl p-10 border border-white/30"
        >
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-white/20 p-4 rounded-2xl shadow-lg backdrop-blur-lg">
              <Car className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-white drop-shadow-md">
              Vehicle<span className="text-yellow-300">Tracker</span>
            </h1>
          </div>

          <h2 className="text-3xl font-semibold text-white mb-4">
            Smart Fleet & Vehicle Management
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Manage vehicles with tracking, analytics, reminders and more.
          </p>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border p-6">
            <h3 className="text-white text-lg font-semibold mb-4">
              Try Demo Accounts
            </h3>

            <div className="space-y-3">
              {demoCredentials.map((cred, i) => {
                const Icon = cred.icon;
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        email: cred.email,
                        password: "demo",
                      });
                      setIsLogin(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/20 hover:bg-white/30 text-white border"
                  >
                    <Icon className="h-6 w-6 text-yellow-200" />
                    <div>
                      <p className="font-semibold">{cred.role}</p>
                      <p className="text-white/80 text-sm">{cred.email}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* RIGHT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "signup"}
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-10 border"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-800">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h3>
              <p className="text-gray-500">
                {isLogin ? "Sign in to continue" : "Create a new account"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NAME */}
              {!isLogin && !awaitingRegistrationOtp && (
                <div>
                  <label className="block text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border"
                    placeholder="John Doe"
                  />
                </div>
              )}

              {/* EMAIL */}
              {!awaitingRegistrationOtp && (!isLogin || !isOtpLogin || !otpSent) && (
                <div>
                  <label className="block text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    className="w-full px-4 py-3 rounded-xl border"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              {/* OTP INPUT */}
              {(awaitingRegistrationOtp || (isLogin && isOtpLogin && otpSent)) && (
                <div>
                  <label className="block text-gray-700 mb-1">Enter OTP sent to email</label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-center text-2xl tracking-widest"
                      placeholder="000000"
                      autoFocus
                    />

                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-500">
                        OTP expires in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (isLogin && isOtpLogin) {
                              await sendLoginOTP(formData.email);
                            } else {
                              await resendOTP(formData.email);
                            }
                            setTimer(600);
                            setSuccess("OTP resent successfully!");
                          } catch (err) {
                            setError("Failed to resend OTP");
                          }
                        }}
                        className="text-purple-600 hover:text-purple-800 font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              {!awaitingRegistrationOtp && !isOtpLogin && (
                <div>
                  <label className="block text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border"
                      placeholder="••••••••"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3 text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* ROLE */}
              {!isLogin && !awaitingRegistrationOtp && (
                <div>
                  <label className="block text-gray-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border"
                  >
                    <option value="personal">Personal User</option>
                    <option value="fleet_owner">Fleet Owner</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={apiLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                           text-white rounded-xl font-semibold shadow-lg hover:opacity-90 
                           transition-all disabled:opacity-50"
              >
                {apiLoading
                  ? "Please wait..."
                  : awaitingRegistrationOtp
                    ? "Verify OTP"
                    : isLogin
                      ? (isOtpLogin
                        ? (otpSent ? "Verify OTP" : "Send OTP")
                        : "Sign In")
                      : "Create Account"}
              </button>

              {/* OTP LOGIN TOGGLE */}
              {isLogin && !otpSent && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpLogin(!isOtpLogin);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium hover:underline"
                  >
                    {isOtpLogin ? "Login with Password" : "Login with OTP"}
                  </button>
                </div>
              )}
            </form>

            {/* SWITCH */}
            {!awaitingRegistrationOtp && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setIsOtpLogin(false);
                    setOtp("");
                    setOtpSent(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-purple-700 font-semibold hover:underline"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already registered? Sign in"}
                </button>
              </div>
            )}

            {awaitingRegistrationOtp && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setAwaitingRegistrationOtp(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Back to Registration
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

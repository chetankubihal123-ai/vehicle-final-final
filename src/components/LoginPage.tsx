import React, { useState, useEffect } from "react";
import {
  Car,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const {
    login,
    register,
    verifyOTP,
    resendOTP,
    sendLoginOTP,
    verifyLoginOTP,
    forgotPassword,
    resetPassword,
    apiLoading,
  } = useAuth();

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

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);

  const [awaitingRegistrationOtp, setAwaitingRegistrationOtp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0: email, 1: otp + new pass
  const [newPassword, setNewPassword] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  // 3D tilt for login card
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
      if (isForgotPassword) {
        if (resetStep === 0) {
          await forgotPassword(formData.email);
          setResetStep(1);
          setSuccess("Reset code sent to your email.");
          setTimer(600);
        } else {
          if (!newPassword) {
            setError("Please enter a new password.");
            return;
          }
          await resetPassword(formData.email, otp, newPassword);
          setSuccess("Password reset successful! You can now login.");
          setIsForgotPassword(false);
          setResetStep(0);
          setOtp("");
          setNewPassword("");
          setIsLogin(true);
        }
      } else if (isLogin) {
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
          await verifyOTP(formData.email, otp);
          setSuccess("Email verified! Please login.");
          setAwaitingRegistrationOtp(false);
          setIsLogin(true);
          setOtp("");
        } else {
          await register(
            formData.email,
            formData.password,
            formData.name,
            formData.role
          );
          setAwaitingRegistrationOtp(true);
          setSuccess(
            "Registration successful! Please enter the OTP sent to your email."
          );
          setTimer(600);
        }
      }
    } catch (err: any) {
      if (err.message === "Please verify your email first") {
        try {
          // Auto-trigger OTP resend for stuck users
          await resendOTP(formData.email);
          setAwaitingRegistrationOtp(true);
          setSuccess("Account exists but not verified. New OTP sent!");
          setTimer(600);
          return;
        } catch (resendErr) {
          setError("Account unverified and failed to resend OTP.");
        }
      }
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  };


  const handleCardMouseMove = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 10;
    const rotateX = -((y - centerY) / centerY) * 10;

    setTilt({ rotateX, rotateY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden transition-colors duration-500">
      {/* DARK MODE TOGGLE */}
      <button
        onClick={() => setDarkMode((prev) => !prev)}
        className="absolute top-6 right-6 z-20 rounded-full border border-white/40 bg-black/30 backdrop-blur-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-white hover:bg-black/70 transition"
      >
        {darkMode ? (
          <>
            <Sun size={14} />
            Light
          </>
        ) : (
          <>
            <Moon size={14} />
            Dark
          </>
        )}
      </button>

      {/* ANIMATED GRADIENT BACKGROUND */}
      <div
        className={`absolute inset-0 animate-gradient-xy ${darkMode
          ? "bg-gradient-to-br from-slate-950 via-purple-950 to-black"
          : "bg-gradient-to-br from-[#2E026D] via-[#6A00F5] to-[#C100FF]"
          }`}
      ></div>

      {/* SVG WAVES BEHIND EVERYTHING */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-45">
        <svg
          className="absolute bottom-0 w-[200%] h-full animate-wave-slow"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveGradient1)"
            d="M0,256L48,245.3C96,235,192,213,288,202.7C384,192,480,192,576,176C672,160,768,128,864,133.3C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <defs>
            <linearGradient id="waveGradient1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff00ff" />
              <stop offset="50%" stopColor="#00ffff" />
              <stop offset="100%" stopColor="#ffea00" />
            </linearGradient>
          </defs>
        </svg>

        <svg
          className="absolute bottom-0 w-[200%] h-full animate-wave-fast opacity-70"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="url(#waveGradient2)"
            d="M0,160L60,170.7C120,181,240,203,360,213.3C480,224,600,224,720,213.3C840,203,960,181,1080,170.7C1200,160,1320,160,1380,160L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
          <defs>
            <linearGradient id="waveGradient2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00ffff" />
              <stop offset="50%" stopColor="#ff00ff" />
              <stop offset="100%" stopColor="#ffea00" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* FLOATING PARTICLES + VEHICLE ICONS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Small particles */}
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={"particle-" + i}
            className="absolute w-2 h-2 bg-white/25 rounded-full"
            initial={{
              x: Math.random() * viewportWidth,
              y: Math.random() * viewportHeight,
              opacity: 0.15 + Math.random() * 0.25,
              scale: 0.4 + Math.random() * 0.8,
            }}
            animate={{
              y: Math.random() * viewportHeight - 200,
              x: Math.random() * viewportWidth - 200,
              opacity: 0.2 + Math.random() * 0.3,
              scale: 0.6 + Math.random() * 0.6,
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Very subtle vehicle-related icons */}
        {["🚗", "🚚", "🛠️", "🛰️", "🚦", "⛽"].map((icon, i) => (
          <motion.div
            key={"vehicle-icon-" + i}
            className="absolute select-none"
            style={{
              fontSize: `${18 + Math.random() * 10}px`,
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
            }}
            initial={{
              x: Math.random() * viewportWidth,
              y: Math.random() * viewportHeight,
              opacity: 0.08,
              scale: 0.7,
            }}
            animate={{
              y: Math.random() * viewportHeight - 150,
              x: Math.random() * viewportWidth - 200,
              opacity: 0.16,
              scale: 1,
              rotate: Math.random() * 20 - 10,
            }}
            transition={{
              duration: 16 + Math.random() * 12,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            {icon}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        {/* LEFT CARD */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all lg:max-w-md"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-white/20 p-3 rounded-2xl shadow-lg backdrop-blur-lg">
              <Car className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-white drop-shadow-md">
              Vehicle<span className="text-yellow-300">Tracker</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Smart Fleet & Vehicle Management
          </h2>
          <p className="text-white/80 mb-6 text-base">
            Manage vehicles with tracking, analytics, reminders, and more.
          </p>

          <div className="relative flex flex-col items-center justify-center py-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center"
            >
              <div className="relative">
                {/* Floating Glow */}
                <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full scale-75 animate-pulse"></div>

                <motion.img
                  src="/welcome_truck.png"
                  alt="Welcome"
                  className="w-full max-w-xs mx-auto drop-shadow-[0_20px_30px_rgba(15,23,42,0.3)] relative z-10"
                  style={{ mixBlendMode: 'multiply' }}
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-6"
              >
                <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-yellow-300 font-bold text-lg mb-3">
                  Hello! 👋 Welcome Back
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">
                  Your Fleet is Ready
                </h3>
                <p className="text-white/70 mt-3 text-lg max-w-sm mx-auto">
                  Sign in to monitor your vehicles and optimize your business operations in real-time.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* RIGHT CARD WITH NEON GLOW + 3D PARALLAX + SLIDE-IN */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 14,
            }}
            className="relative"
          >
            <div
              className="neon-border rounded-3xl p-[2px]"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <motion.div
                style={{
                  rotateX: tilt.rotateX,
                  rotateY: tilt.rotateY,
                  transformPerspective: 1200,
                }}
                className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl p-10 border border-white/40 hover:shadow-[0_0_40px_rgba(255,255,255,0.35)] transition"
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
                      <label className="block text-gray-700 mb-1">
                        Full Name
                      </label>
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
                  {!awaitingRegistrationOtp &&
                    (!isLogin || !isOtpLogin || !otpSent) && (
                      <div>
                        <label className="block text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl border"
                          placeholder="you@example.com"
                        />
                      </div>
                    )}

                  {/* OTP INPUT */}
                  {(awaitingRegistrationOtp ||
                    (isLogin && isOtpLogin && otpSent)) && (
                      <div>
                        <label className="block text-gray-700 mb-1">
                          Enter OTP sent to email
                        </label>
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
                              OTP expires in {Math.floor(timer / 60)}:
                              {(timer % 60).toString().padStart(2, "0")}
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
                  {!awaitingRegistrationOtp && !isOtpLogin && !isForgotPassword && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-gray-700">Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setResetStep(0);
                            setError("");
                            setSuccess("");
                          }}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl border"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3 text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* RESET PASSWORD FLOW */}
                  {isForgotPassword && resetStep === 1 && (
                    <div className="space-y-4">
                      {/* NEW PASSWORD */}
                      <div>
                        <label className="block text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-3 text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* OTP FOR RESET */}
                      <div>
                        <label className="block text-gray-700 mb-1">
                          Reset Code (OTP)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border text-center tracking-widest text-xl"
                          placeholder="000000"
                        />
                        <div className="flex justify-between items-center text-xs mt-2">
                          <p className="text-gray-500">
                            Expires in {Math.floor(timer / 60)}:
                            {(timer % 60).toString().padStart(2, "0")}
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await forgotPassword(formData.email);
                                setTimer(600);
                                setSuccess("New reset code sent!");
                              } catch (err) {
                                setError("Failed to resend code");
                              }
                            }}
                            className="text-purple-600 font-semibold"
                          >
                            Resend Code
                          </button>
                        </div>
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

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={apiLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 
                               text-white rounded-xl font-semibold shadow-lg hover:opacity-90 
                               transition-all disabled:opacity-50"
                  >
                    {apiLoading
                      ? "Please wait..."
                      : awaitingRegistrationOtp
                        ? "Verify OTP"
                        : isForgotPassword
                          ? resetStep === 0
                            ? "Send Reset Code"
                            : "Reset Password"
                          : isLogin
                            ? isOtpLogin
                              ? otpSent
                                ? "Verify OTP"
                                : "Send OTP"
                              : "Sign In"
                            : "Create Account"}
                  </button>

                  {/* BACK BUTTON FOR FORGOT PASSWORD */}
                  {isForgotPassword && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setResetStep(0);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Back to Login
                      </button>
                    </div>
                  )}

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

                {/* SWITCH LOGIN / SIGNUP */}
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
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* WATERMARK */}
      <div className="absolute bottom-6 w-full flex justify-center pointer-events-none z-20">
        <p className="text-white/50 text-xs tracking-widest select-none">
          MADE BY CARS
        </p>
      </div>

      {/* EXTRA STYLES */}
      <style>{`
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradientMove 12s ease infinite;
        }

        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .neon-border {
          background: linear-gradient(
            120deg,
            #ff00ff,
            #00ffff,
            #ffea00,
            #ff00ff
          );
          background-size: 300% 300%;
          animation: neonGlow 6s linear infinite;
          box-shadow:
            0 0 15px rgba(255, 0, 255, 0.45),
            0 0 22px rgba(0, 255, 255, 0.35),
            0 0 30px rgba(255, 234, 0, 0.25);
        }

        @keyframes neonGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-wave-slow {
          animation: waveMove 18s linear infinite;
        }

        .animate-wave-fast {
          animation: waveMove 12s linear infinite reverse;
        }

        @keyframes waveMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// backend/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../services/emailService");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
  try {
    console.log("Register request received:", req.body);
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const validRoles = ["admin", "fleet_owner", "driver", "personal"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let user = await User.findOne({ email });
    if (user) {
      console.log("User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    console.log("Generated OTP:", otp);
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpires,
    });

    await user.save();
    console.log("User saved, sending OTP...");

    const emailSent = await sendOTP(email, otp, name);
    console.log("OTP Email sent result:", emailSent);

    if (!emailSent) {
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res
      .status(201)
      .json({ message: "User registered. Please verify OTP sent to email." });
  } catch (error) {
    console.error("Registration error details:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log("Resending OTP to:", email);
    const emailSent = await sendOTP(email, otp, user.name);
    console.log("Resend OTP result:", emailSent);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified)
      return res.status(400).json({ message: "Please verify your email first" });
    if (!user.isActive)
      return res.status(403).json({ message: "Account is inactive" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    let assignedVehicleId = null;
    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");
      const driverProfile = await Driver.findOne({ userId: user._id });
      if (driverProfile) {
        const vehicle = await Vehicle.findOne({
          currentDriver: driverProfile._id,
        });
        if (vehicle) {
          assignedVehicleId = vehicle._id;
        }
      }
    }

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedVehicleId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.isActive)
      return res.status(403).json({ message: "Account is inactive" });

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log("Sending Login OTP to:", email);
    const emailSent = await sendOTP(email, otp, user.name);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send Login OTP error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    if (!user.isVerified) {
      user.isVerified = true;
    }
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    let assignedVehicleId = null;
    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");
      const driverProfile = await Driver.findOne({ userId: user._id });
      if (driverProfile) {
        const vehicle = await Vehicle.findOne({
          currentDriver: driverProfile._id,
        });
        if (vehicle) {
          assignedVehicleId = vehicle._id;
        }
      }
    }

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedVehicleId,
      },
    });
  } catch (error) {
    console.error("Verify Login OTP error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    console.log("👤 getMe called for user:", req.user.id);
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpires"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let assignedVehicleId = null;
    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");

      const driverProfile = await Driver.findOne({ userId: user._id });

      if (driverProfile) {
        console.log("🔍 Found driver profile:", driverProfile._id);
        const vehicle = await Vehicle.findOne({
          currentDriver: driverProfile._id,
        });
        if (vehicle) {
          console.log("✅ Found vehicle:", vehicle._id);
          assignedVehicleId = vehicle._id;
        } else {
          console.log(
            "⚠️ No vehicle found for driver profile:",
            driverProfile._id
          );
        }
      } else {
        console.log("⚠️ No driver profile found for user:", user._id);
      }
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedVehicleId,
    });
  } catch (error) {
    console.error("Get Me error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

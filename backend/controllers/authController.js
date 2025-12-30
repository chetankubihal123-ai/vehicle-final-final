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
      console.log("⚠️ Email failed to send. DEV MODE: OTP is", otp);
      // Allow registration to proceed for demo purposes
      // await User.deleteOne({ _id: user._id });
      // return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res
      .status(201)
      .json({ message: "User registered. Please verify OTP (Check email or server console)." });
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
    const sent = await sendOTP(email, otp, user.name);
    if (!sent) {
      console.log("⚠️ Resend Email failed. OTP:", otp);
      return res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
    }

    console.log("Resend OTP sending in background...");

    res.json({ message: "OTP resent successfully (Check email or console)" });
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
    let vehicleData = null;
    let driverStatus = null;

    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");
      const driverProfile = await Driver.findOne({ userId: user._id });
      if (driverProfile) {
        driverStatus = driverProfile.status;
        const vehicle = await Vehicle.findOne({
          currentDriver: driverProfile._id,
        });
        if (vehicle) {
          assignedVehicleId = vehicle._id;
          vehicleData = vehicle;
          // Deactivate old tracking session for this vehicle
          const RouteHistory = require("../models/RouteHistory");
          await RouteHistory.updateMany(
            { vehicleId: assignedVehicleId, isActive: true },
            { isActive: false }
          );
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
        assignedVehicle: vehicleData,
        driverStatus,
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
    const sent = await sendOTP(email, otp, user.name);
    if (!sent) {
      console.log("⚠️ Login OTP Email failed. OTP:", otp);
      return res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
    }

    res.json({ message: "OTP sent successfully. Please check your email." });
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
    let vehicleData = null;
    let driverStatus = null;

    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");
      const driverProfile = await Driver.findOne({ userId: user._id });
      if (driverProfile) {
        driverStatus = driverProfile.status;
        const vehicle = await Vehicle.findOne({
          currentDriver: driverProfile._id,
        });
        if (vehicle) {
          assignedVehicleId = vehicle._id;
          vehicleData = vehicle;

          // Deactivate old tracking session for this vehicle
          const RouteHistory = require("../models/RouteHistory");
          await RouteHistory.updateMany(
            { vehicleId: assignedVehicleId, isActive: true },
            { isActive: false }
          );
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
        assignedVehicle: vehicleData,
        driverStatus,
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
    let driverStatus = null;

    if (user.role === "driver") {
      const Driver = require("../models/Driver");
      const Vehicle = require("../models/Vehicle");

      const driverProfile = await Driver.findOne({ userId: user._id });

      if (driverProfile) {
        console.log("🔍 Found driver profile:", driverProfile._id);
        driverStatus = driverProfile.status;
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
      profilePic: user.profilePic,
      phone: user.phone,
      dob: user.dob,
      address: user.address,
      gender: user.gender,
      assignedVehicleId,
      driverStatus,
    });
  } catch (error) {
    console.error("Get Me error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// --- PASSWORD RESET ---

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "No account found with this email" });
    if (!user.isActive) return res.status(403).json({ message: "Account is inactive" });

    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log("🔑 Password Reset OTP for:", email);
    const sent = await sendOTP(email, otp, user.name);
    if (!sent) {
      return res.status(500).json({ message: "Failed to send reset code. Try again later." });
    }

    res.json({ message: "Reset code sent to your email." });
  } catch (error) {
    console.error("Forgot Password error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    if (!user.isVerified) user.isVerified = true;

    await user.save();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    console.error("Reset Password error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, dob, address, gender } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        phone: user.phone,
        dob: user.dob,
        address: user.address,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error("Update Profile error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const profilePicPath = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePic: profilePicPath },
      { new: true }
    );

    res.json({
      message: "Profile picture updated successfully",
      profilePic: profilePicPath
    });
  } catch (error) {
    console.error("Update Profile Pic error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

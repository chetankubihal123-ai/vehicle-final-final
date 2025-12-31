const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../services/emailService");

// Helper: normalize any incoming vehicle value to either a valid ObjectId string or null
const normalizeVehicle = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed === "No Vehicle Assigned" ||
      trimmed === "null" ||
      trimmed === "undefined"
    ) {
      return null;
    }
    // if it's not a valid ObjectId, treat as null (avoid CastError)
    if (!mongoose.Types.ObjectId.isValid(trimmed)) {
      return null;
    }
    return trimmed;
  }

  // if frontend accidentally sends an object like { _id: "..." }
  if (typeof value === "object" && value !== null && value._id) {
    const id = String(value._id);
    if (mongoose.Types.ObjectId.isValid(id)) return id;
  }

  return null;
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ---------------------- ADD DRIVER ----------------------
exports.addDriver = async (req, res) => {
  try {
    const { name, email, password, licenseNumber, assignedVehicle, profilePic } = req.body;

    console.log("[ADD_DRIVER] payload:", {
      name,
      email,
      licenseNumber,
      assignedVehicle,
      userId: req.user?.id,
    });

    // 1. Check for existing user
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("[ADD_DRIVER] user already exists:", email);
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // 2. Validate Email Implementation (Send OTP)
    // We send the OTP *before* saving to ensure the email is valid/deliverable.
    const otp = generateOTP();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    console.log(`[ADD_DRIVER] verifying email ${email} with OTP...`);
    const emailSent = await sendOTP(email, otp, name);

    if (!emailSent) {
      console.error("[ADD_DRIVER] Failed to send verification email (Fake/Invalid Email Protection)");
      return res.status(400).json({
        message: "Failed to verify email address. Please provide a valid email that can receive messages."
      });
    }

    // 3. Create User with role=driver
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "driver",
      isVerified: false, // Enforce verification!
      otp,
      otpExpires,
      profilePic: profilePic || "",
    });
    await user.save();

    // 4. Create Driver profile
    const vehicleId = normalizeVehicle(assignedVehicle);

    const driver = new Driver({
      userId: user._id,
      ownerId: req.user.id,
      licenseNumber,
      assignedVehicle: vehicleId,
      driverName: name, // Denormalized name
      driverEmail: email // Denormalized email
    });

    await driver.save();

    // 5. If a valid vehicle is selected, set currentDriver on that vehicle
    if (vehicleId) {
      const Vehicle = require("../models/Vehicle");
      await Vehicle.findByIdAndUpdate(vehicleId, {
        currentDriver: driver._id,
      });
    }

    console.log("[ADD_DRIVER] success for:", email);

    res.status(201).json({
      message: "Driver added successfully. Verification email sent.",
      driver
    });
  } catch (error) {
    console.error("[ADD_DRIVER] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------------- UPDATE DRIVER ----------------------
exports.updateDriver = async (req, res) => {
  try {
    const { licenseNumber, assignedVehicle, status } = req.body;
    const driverId = req.params.id;

    console.log("[UPDATE_DRIVER] driverId:", driverId, "body:", req.body);

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Auth check
    if (req.user.role !== "admin" && driver.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const Vehicle = require("../models/Vehicle");

    const newVehicle = normalizeVehicle(assignedVehicle);
    const oldVehicle = driver.assignedVehicle
      ? String(driver.assignedVehicle)
      : null;

    // If vehicle changed, update Vehicle.currentDriver references
    if (String(newVehicle || "") !== String(oldVehicle || "")) {
      // clear old vehicle
      if (oldVehicle && mongoose.Types.ObjectId.isValid(oldVehicle)) {
        await Vehicle.findByIdAndUpdate(oldVehicle, {
          $unset: { currentDriver: "" },
        });
      }

      // set new vehicle
      if (newVehicle) {
        await Vehicle.findByIdAndUpdate(newVehicle, {
          currentDriver: driver._id,
        });
      }

      driver.assignedVehicle = newVehicle;
    }

    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
    if (status !== undefined) driver.status = status;

    // Handle User Updates
    const { password, name, email, profilePic } = req.body;
    const userUpdate = {};
    if (name) {
      userUpdate.name = name;
      driver.driverName = name; // Sync to driver
    }
    if (email) {
      userUpdate.email = email;
      driver.driverEmail = email; // Sync to driver
    }
    if (profilePic !== undefined) userUpdate.profilePic = profilePic;
    if (password && password.trim() !== "") {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(driver.userId, userUpdate);
      console.log("[UPDATE_DRIVER] User details updated:", driver.userId);
    }

    await driver.save();

    console.log("[UPDATE_DRIVER] success:", driverId);

    res.json({ message: "Driver updated successfully", driver });
  } catch (error) {
    console.error("[UPDATE_DRIVER] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------------- GET ALL DRIVERS ----------------------
exports.getDrivers = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin" ? {} : { ownerId: req.user.id };

    const drivers = await Driver.find(filter)
      .populate("userId", "name email profilePic")
      .populate("assignedVehicle", "registrationNumber make model");

    res.json(drivers);
  } catch (error) {
    console.error("[GET_DRIVERS] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------------- ASSIGN VEHICLE ----------------------
exports.assignVehicle = async (req, res) => {
  try {
    const { driverId, vehicleId } = req.body;
    console.log("[ASSIGN_VEHICLE] body:", req.body);

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    if (req.user.role !== "admin" && driver.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const Vehicle = require("../models/Vehicle");

    const newVehicle = normalizeVehicle(vehicleId);
    const oldVehicle = driver.assignedVehicle
      ? String(driver.assignedVehicle)
      : null;

    // clear old vehicle
    if (oldVehicle && mongoose.Types.ObjectId.isValid(oldVehicle)) {
      await Vehicle.findByIdAndUpdate(oldVehicle, {
        $unset: { currentDriver: "" },
      });
    }

    // set new vehicle
    if (newVehicle) {
      await Vehicle.findByIdAndUpdate(newVehicle, {
        currentDriver: driver._id,
      });
      driver.assignedVehicle = newVehicle;
    } else {
      driver.assignedVehicle = null;
    }

    await driver.save();

    console.log("[ASSIGN_VEHICLE] success for driver:", driverId);

    res.json({ message: "Vehicle assigned successfully" });
  } catch (error) {
    console.error("[ASSIGN_VEHICLE] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------------- GET MY VEHICLE (DRIVER) ----------------------
exports.getMyVehicle = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id }).populate(
      "assignedVehicle"
    );

    if (!driver)
      return res.status(404).json({ message: "Driver profile not found" });

    res.json({
      vehicle: driver.assignedVehicle || null,
      message: driver.assignedVehicle ? "Vehicle assigned" : "No vehicle assigned",
    });
  } catch (error) {
    console.error("[GET_MY_VEHICLE] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// ---------------------- DELETE DRIVER ----------------------
exports.deleteDriver = async (req, res) => {
  try {
    const driverId = req.params.id;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Check owner/admin access
    if (req.user.role !== "admin" && driver.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const Vehicle = require("../models/Vehicle");

    // Remove driver from any assigned vehicle
    if (driver.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(driver.assignedVehicle, {
        $unset: { currentDriver: "" }
      });
    }

    // Delete linked user account
    await User.findByIdAndDelete(driver.userId);

    // Delete driver profile
    await Driver.findByIdAndDelete(driverId);

    return res.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("[DELETE_DRIVER] Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

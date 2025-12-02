const Driver = require('../models/Driver');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Utility: Normalize assignedVehicle field
const normalizeVehicle = (value) => {
    if (!value) return null;
    if (value === "No Vehicle Assigned") return null;
    if (value === "") return null;
    return value; // valid ObjectId
};

// Add a new driver
exports.addDriver = async (req, res) => {
    try {
        const { name, email, password, licenseNumber, assignedVehicle } = req.body;

        // 1. Create User account for driver
        let existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: 'User with this email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'driver',
            isVerified: true  // owner/admin added -> auto verified
        });

        await user.save();

        // 2. Create Driver profile
        const driver = new Driver({
            userId: user._id,
            ownerId: req.user.id,
            licenseNumber,
            assignedVehicle: normalizeVehicle(assignedVehicle)
        });

        await driver.save();

        // 3. Update vehicle state only if valid
        const vehicleId = normalizeVehicle(assignedVehicle);
        if (vehicleId) {
            const Vehicle = require('../models/Vehicle');
            await Vehicle.findByIdAndUpdate(vehicleId, { currentDriver: driver._id });
        }

        res.status(201).json({ message: 'Driver added successfully', driver });

    } catch (error) {
        console.error("Add Driver Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update driver
exports.updateDriver = async (req, res) => {
    try {
        const { licenseNumber, assignedVehicle, status } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        // Auth check
        if (req.user.role !== 'admin' && driver.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const newVehicle = normalizeVehicle(assignedVehicle);
        const oldVehicle = driver.assignedVehicle;

        // Handle vehicle reassignment
        if (String(newVehicle) !== String(oldVehicle)) {
            const Vehicle = require('../models/Vehicle');

            // Clear old vehicle if exists
            if (oldVehicle) {
                await Vehicle.findByIdAndUpdate(oldVehicle, { $unset: { currentDriver: "" } });
            }

            // Assign new vehicle if valid
            if (newVehicle) {
                await Vehicle.findByIdAndUpdate(newVehicle, { currentDriver: driver._id });
            }

            driver.assignedVehicle = newVehicle;
        }

        driver.licenseNumber = licenseNumber ?? driver.licenseNumber;
        driver.status = status ?? driver.status;

        await driver.save();

        res.json({ message: 'Driver updated successfully', driver });

    } catch (error) {
        console.error("Update Driver Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all drivers
exports.getDrivers = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? {}
            : { ownerId: req.user.id };

        const drivers = await Driver.find(filter)
            .populate('userId', 'name email')
            .populate('assignedVehicle', 'registrationNumber');

        res.json(drivers);

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Assign vehicle to driver
exports.assignVehicle = async (req, res) => {
    try {
        const { driverId, vehicleId } = req.body;

        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        if (req.user.role !== 'admin' && driver.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const newVehicle = normalizeVehicle(vehicleId);

        driver.assignedVehicle = newVehicle;
        await driver.save();

        const Vehicle = require('../models/Vehicle');
        await Vehicle.findByIdAndUpdate(newVehicle, { currentDriver: driverId });

        res.json({ message: 'Vehicle assigned successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get logged-in driver's assigned vehicle
exports.getMyVehicle = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id })
            .populate('assignedVehicle');

        if (!driver)
            return res.status(404).json({ message: 'Driver profile not found' });

        res.json({
            vehicle: driver.assignedVehicle || null,
            message: driver.assignedVehicle ? 'Vehicle assigned' : 'No vehicle assigned'
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

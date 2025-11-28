const Driver = require('../models/Driver');
const User = require('../models/User');

// Add a new driver
exports.addDriver = async (req, res) => {
    try {
        const { name, email, password, licenseNumber, assignedVehicle } = req.body;

        // 1. Create User account for driver
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User with this email already exists' });

        const hashedPassword = await require('bcryptjs').hash(password, 10);
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'driver',
            isVerified: true // Auto-verify drivers added by admin/owner
        });
        await user.save();

        // 2. Create Driver profile
        const driver = new Driver({
            userId: user._id,
            ownerId: req.user.id,
            licenseNumber,
            assignedVehicle
        });

        await driver.save();

        // If vehicle assigned, update vehicle
        if (assignedVehicle) {
            const Vehicle = require('../models/Vehicle');
            await Vehicle.findByIdAndUpdate(assignedVehicle, { currentDriver: driver._id });
        }

        res.status(201).json({ message: 'Driver added successfully', driver });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update driver
exports.updateDriver = async (req, res) => {
    try {
        const { licenseNumber, assignedVehicle, status } = req.body;
        const driver = await Driver.findById(req.params.id);

        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        if (req.user.role !== 'admin' && driver.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Handle vehicle change
        if (assignedVehicle && assignedVehicle !== driver.assignedVehicle?.toString()) {
            const Vehicle = require('../models/Vehicle');
            // Clear old vehicle
            if (driver.assignedVehicle) {
                await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { $unset: { currentDriver: "" } });
            }
            // Set new vehicle
            await Vehicle.findByIdAndUpdate(assignedVehicle, { currentDriver: driver._id });
        }

        driver.licenseNumber = licenseNumber || driver.licenseNumber;
        driver.assignedVehicle = assignedVehicle || driver.assignedVehicle;
        driver.status = status || driver.status;

        await driver.save();
        res.json({ message: 'Driver updated successfully', driver });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all drivers
exports.getDrivers = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin') {
            query.ownerId = req.user.id;
        }

        const drivers = await Driver.find(query).populate('userId', 'name email').populate('assignedVehicle', 'registrationNumber');
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

        // Check ownership
        if (req.user.role !== 'admin' && driver.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        driver.assignedVehicle = vehicleId;
        await driver.save();

        // Also update vehicle's current driver
        const Vehicle = require('../models/Vehicle');
        await Vehicle.findByIdAndUpdate(vehicleId, { currentDriver: driverId });

        res.json({ message: 'Vehicle assigned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
// Get logged-in driver's assigned vehicle
exports.getMyVehicle = async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user.id }).populate('assignedVehicle');
        if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

        if (!driver.assignedVehicle) {
            return res.json({ message: 'No vehicle assigned', vehicle: null });
        }

        res.json({ vehicle: driver.assignedVehicle });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

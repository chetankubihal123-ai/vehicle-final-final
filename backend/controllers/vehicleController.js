const Vehicle = require('../models/Vehicle');

// Add a new vehicle
exports.addVehicle = async (req, res) => {
    try {
        const { registrationNumber, make, model, year, type, fuelType, currentMileage, serviceDate, insuranceExpiry, permitExpiry } = req.body;

        // Check if vehicle already exists
        const existingVehicle = await Vehicle.findOne({ registrationNumber });
        if (existingVehicle) {
            return res.status(400).json({ message: 'Vehicle with this registration number already exists' });
        }

        const vehicle = new Vehicle({
            ownerId: req.user.id, // Assumes auth middleware adds user to req
            registrationNumber,
            make,
            model,
            year,
            type,
            fuelType,
            currentMileage,
            serviceDate,
            insuranceExpiry,
            permitExpiry
        });

        await vehicle.save();
        res.status(201).json({ message: 'Vehicle added successfully', vehicle });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all vehicles (for the logged-in owner/admin)
exports.getVehicles = async (req, res) => {
    try {
        let query = {};
        // If not admin, only show own vehicles
        if (req.user.role === 'driver') {
            const Driver = require('../models/Driver');
            const driver = await Driver.findOne({ userId: req.user.id });
            if (driver) {
                query.currentDriver = driver._id;
            } else {
                return res.json([]);
            }
        } else if (req.user.role !== 'admin') {
            query.ownerId = req.user.id;
        }

        const vehicles = await Vehicle.find(query).populate('currentDriver', 'name licenseNumber');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get single vehicle
exports.getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id).populate('currentDriver');
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        // Access control
        if (req.user.role !== 'admin' && vehicle.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update vehicle
exports.updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        if (req.user.role !== 'admin' && vehicle.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({ message: 'Vehicle updated', vehicle: updatedVehicle });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Delete vehicle
exports.deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        if (req.user.role !== 'admin' && vehicle.ownerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

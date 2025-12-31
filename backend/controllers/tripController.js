const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// Manual Trip Creation
exports.createTrip = async (req, res) => {
    try {
        const { vehicleId, startLocation, startLocationLat, startLocationLon, endLocation, endLocationLat, endLocationLon, startMileage, endMileage, tripDate, fuelConsumed, purpose } = req.body;

        let driverId = null;
        if (req.user.role === 'driver') {
            const driver = await Driver.findOne({ userId: req.user.id });
            if (driver) driverId = driver._id;
        }

        const trip = new Trip({
            driverId,
            vehicleId,
            startLocation,
            startLocationLat,
            startLocationLon,
            endLocation,
            endLocationLat,
            endLocationLon,
            startMileage,
            endMileage,
            startTime: tripDate || Date.now(),
            endTime: tripDate || Date.now(), // Assuming single day trip for manual entry
            distance: endMileage - startMileage,
            fuelConsumed,
            purpose,
            status: 'Completed'
        });

        await trip.save();
        res.status(201).json({ message: 'Trip logged successfully', trip });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Start a new trip
exports.startTrip = async (req, res) => {
    try {
        const { vehicleId, startLocation, purpose } = req.body;

        // Find driver profile for the logged-in user
        const driver = await Driver.findOne({ userId: req.user.id });
        if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

        // Check if vehicle is available
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        // Create trip
        const trip = new Trip({
            driverId: driver._id,
            vehicleId,
            startTime: Date.now(),
            startLocation,
            purpose,
            status: 'Ongoing'
        });

        await trip.save();

        // Update driver status
        driver.status = 'On Trip';
        await driver.save();

        res.status(201).json({ message: 'Trip started', trip });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// End trip
exports.endTrip = async (req, res) => {
    try {
        const { tripId, endLocation, distance } = req.body;

        const trip = await Trip.findById(tripId);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });
        if (trip.status === 'Completed') return res.status(400).json({ message: 'Trip already completed' });

        trip.endTime = Date.now();
        trip.endLocation = endLocation;
        trip.distance = distance;
        trip.status = 'Completed';
        await trip.save();

        // Update driver status
        await Driver.findByIdAndUpdate(trip.driverId, { status: 'Available' });

        res.json({ message: 'Trip completed', trip });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get trips (for driver or owner)
exports.getTrips = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'driver') {
            const driver = await Driver.findOne({ userId: req.user.id });

            const conditions = [
                { driverId: new mongoose.Types.ObjectId(req.user.id) }
            ];

            if (driver) {
                // Also match by Driver ID from profile
                conditions.push({ driverId: driver._id });
            }

            if (driver && driver.assignedVehicle && mongoose.Types.ObjectId.isValid(driver.assignedVehicle)) {
                // PRIMARY CASE: Driver has a vehicle. Show ALL trips for this vehicle.
                conditions.push({ vehicleId: new mongoose.Types.ObjectId(driver.assignedVehicle) });
            }

            query.$or = conditions;

        } else if (req.user.role === 'fleet_owner' || req.user.role === 'admin') {
            // Owners see trips for their vehicles
            const vehicles = await Vehicle.find({ ownerId: req.user.id }).select('_id');
            const vehicleIds = vehicles.map(v => v._id);
            query.vehicleId = { $in: vehicleIds };
        }

        const trips = await Trip.find(query)
            .populate('vehicleId', 'registrationNumber model')
            .populate({
                path: 'driverId',
                select: 'licenseNumber userId',
                populate: { path: 'userId', select: 'name' }
            })
            .sort({ startTime: -1 });

        res.json(trips);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update trip
exports.updateTrip = async (req, res) => {
    try {
        const { vehicleId, startLocation, startLocationLat, startLocationLon, endLocation, endLocationLat, endLocationLon, startMileage, endMileage, tripDate, fuelConsumed, purpose } = req.body;

        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        // Update trip fields
        if (vehicleId) trip.vehicleId = vehicleId;
        if (startLocation) trip.startLocation = startLocation;
        if (startLocationLat) trip.startLocationLat = startLocationLat;
        if (startLocationLon) trip.startLocationLon = startLocationLon;
        if (endLocation) trip.endLocation = endLocation;
        if (endLocationLat) trip.endLocationLat = endLocationLat;
        if (endLocationLon) trip.endLocationLon = endLocationLon;
        if (startMileage !== undefined) trip.startMileage = startMileage;
        if (endMileage !== undefined) {
            trip.endMileage = endMileage;
            trip.distance = endMileage - trip.startMileage;
        }
        if (tripDate) trip.startTime = tripDate;
        if (fuelConsumed !== undefined) trip.fuelConsumed = fuelConsumed;
        if (purpose) trip.purpose = purpose;

        await trip.save();
        res.json({ message: 'Trip updated successfully', trip });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

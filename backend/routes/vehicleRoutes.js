const express = require('express');
const router = express.Router();
const { addVehicle, getVehicles, getVehicleById, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const auth = require('../middleware/authMiddleware');

// All routes require authentication
// Only Admin and Owner can manage vehicles
router.post('/', auth(['admin', 'fleet_owner']), addVehicle);
router.get('/', auth(['admin', 'fleet_owner', 'driver']), getVehicles); // Drivers might need to see vehicles too?
router.get('/:id', auth(['admin', 'fleet_owner', 'driver']), getVehicleById);
router.put('/:id', auth(['admin', 'fleet_owner']), updateVehicle);
router.delete('/:id', auth(['admin', 'fleet_owner']), deleteVehicle);

// Location tracking route - drivers can update their vehicle's location
router.post('/:id/location', auth(['driver', 'admin', 'fleet_owner']), async (req, res) => {
    try {
        const { latitude, longitude, timestamp, speed } = req.body;
        const Vehicle = require('../models/Vehicle');

        // Find the vehicle
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Update current location
        vehicle.currentLocation = {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
            timestamp: timestamp || new Date(),
            speed: speed || null
        };

        // Add to location history (keep last 100 points)
        if (!vehicle.locationHistory) {
            vehicle.locationHistory = [];
        }

        vehicle.locationHistory.push({
            type: 'Point',
            coordinates: [longitude, latitude],
            timestamp: timestamp || new Date(),
            speed: speed || null
        });

        // Keep only last 100 locations to save database space
        if (vehicle.locationHistory.length > 100) {
            vehicle.locationHistory = vehicle.locationHistory.slice(-100);
        }

        await vehicle.save();

        // Broadcast to connected clients via Socket.io (if available)
        const io = req.app.get('io');
        if (io) {
            io.emit('location-update', {
                vehicleId: vehicle._id,
                vehicleNumber: vehicle.vehicleNumber,
                latitude,
                longitude,
                timestamp: timestamp || new Date(),
                speed
            });
        }

        res.json({
            success: true,
            message: 'Location updated successfully',
            location: {
                latitude,
                longitude,
                timestamp: timestamp || new Date()
            }
        });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ message: 'Error updating location', error: error.message });
    }
});

module.exports = router;

// controllers/locationController.js
const LiveLocation = require('../models/LiveLocation');
const RouteHistory = require('../models/RouteHistory');

// HTTP fallback: update current location (driver only)
exports.updateLocation = async (req, res) => {
    try {
        const { vehicleId, lat, lng } = req.body;

        if (!vehicleId || lat == null || lng == null) {
            return res.status(400).json({ message: 'vehicleId, lat, lng are required' });
        }

        const driverId = req.user.id; // from auth middleware

        const timestamp = new Date();

        // 1) Update LiveLocation (current position)
        await LiveLocation.findOneAndUpdate(
            { vehicleId },
            {
                vehicleId,
                driverId,
                lat,
                lng,
                timestamp
            },
            { upsert: true, new: true }
        );

        // 2) Append to today’s RouteHistory
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        await RouteHistory.findOneAndUpdate(
            {
                vehicleId,
                createdAt: { $gte: startOfDay }
            },
            {
                $setOnInsert: { vehicleId, driverId },
                $push: {
                    locations: { lat, lng, timestamp }
                }
            },
            { upsert: true, new: true }
        );

        res.json({ message: 'Location updated (live tracking)', timestamp });
    } catch (error) {
        console.error('updateLocation error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get current live location of a vehicle
exports.getLiveLocation = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const location = await LiveLocation.findOne({ vehicleId })
            .populate('vehicleId', 'registrationNumber')
            .populate('driverId', 'name');

        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json(location);
    } catch (error) {
        console.error('getLiveLocation error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get today’s route history for a vehicle
exports.getRouteHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const history = await RouteHistory.findOne({
            vehicleId,
            createdAt: { $gte: startOfDay }
        }).populate('vehicleId', 'registrationNumber');

        if (!history || history.locations.length === 0) {
            return res.status(404).json({ message: 'History not found for today' });
        }

        res.json(history);
    } catch (error) {
        console.error('getRouteHistory error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

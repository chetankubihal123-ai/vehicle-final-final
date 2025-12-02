// routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const {
    updateLocation,
    getLiveLocation,
    getRouteHistory
} = require('../controllers/locationController');
const auth = require('../middleware/authMiddleware');

// Driver sends manual updates (fallback if Socket fails)
router.post('/update', auth(['driver']), updateLocation);

// Anyone who tracks vehicles (admin/fleet_owner) + driver for own vehicle if you want
router.get('/live/:vehicleId', auth(['fleet_owner', 'admin', 'driver']), getLiveLocation);

// Route history of vehicle (typically admin/fleet_owner)
router.get('/history/:vehicleId', auth(['fleet_owner', 'admin']), getRouteHistory);

module.exports = router;

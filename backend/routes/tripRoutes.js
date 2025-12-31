const express = require('express');
const router = express.Router();
const { startTrip, endTrip, getTrips, createTrip, updateTrip } = require('../controllers/tripController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth(['driver', 'fleet_owner', 'admin']), createTrip);
router.put('/:id', auth(['driver', 'fleet_owner', 'admin']), updateTrip);

console.log("[DEBUG] Routes initialized"); // Placeholder debug
router.post('/start', auth(['driver']), startTrip);
router.post('/end', auth(['driver']), endTrip);
router.get('/', auth(['driver', 'fleet_owner', 'admin']), getTrips);
router.delete('/:id', auth(['fleet_owner', 'admin']), require('../controllers/tripController').deleteTrip);

module.exports = router;

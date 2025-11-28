const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, unique: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Index for TTL (optional, or just update the same doc)
// We will upsert this document for each vehicle.
module.exports = mongoose.model('LiveLocation', liveLocationSchema);

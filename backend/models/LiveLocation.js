// models/LiveLocation.js
const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        unique: true // one "current" record per vehicle
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('LiveLocation', liveLocationSchema);

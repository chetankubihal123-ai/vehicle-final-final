const mongoose = require('mongoose');

const routeHistorySchema = new mongoose.Schema({
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }, // Optional for ad-hoc tracking
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    locations: [{
        lat: Number,
        lng: Number,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('RouteHistory', routeHistorySchema);

// models/RouteHistory.js
const mongoose = require('mongoose');

const routeHistorySchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    // optional: driverId if you want
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    locations: [
        {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            speed: { type: Number, default: 0 },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // createdAt used for "today" filter
});

routeHistorySchema.index({ vehicleId: 1, isActive: 1 });
routeHistorySchema.index({ vehicleId: 1, createdAt: -1 });

module.exports = mongoose.model('RouteHistory', routeHistorySchema);

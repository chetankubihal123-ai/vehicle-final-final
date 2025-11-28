const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: false },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    startLocation: { type: String },
    startLocationLat: { type: String },
    startLocationLon: { type: String },
    endLocation: { type: String },
    endLocationLat: { type: String },
    endLocationLon: { type: String },
    startMileage: { type: Number },
    endMileage: { type: Number },
    distance: { type: Number, default: 0 }, // in km
    fuelConsumed: { type: Number },
    purpose: { type: String },
    status: { type: String, enum: ['Ongoing', 'Completed'], default: 'Ongoing' }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);

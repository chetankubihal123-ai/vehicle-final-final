const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registrationNumber: { type: String, required: true, unique: true },
    make: { type: String },
    model: { type: String, required: true },
    year: { type: Number },
    type: { type: String, required: true }, // e.g., Truck, Car, Bike
    fuelType: { type: String },
    currentMileage: { type: Number, default: 0 },
    serviceDate: { type: Date },
    insuranceExpiry: { type: Date },
    permitExpiry: { type: Date },
    documents: [{ type: String }], // URLs to uploaded docs
    currentDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
    currentLocation: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
        timestamp: { type: Date },
        speed: { type: Number }
    },
    locationHistory: [{
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number] },
        timestamp: { type: Date },
        speed: { type: Number }
    }]
}, { timestamps: true });

// Add geospatial index for location queries
vehicleSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to User account
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Who employs this driver
    licenseNumber: { type: String, required: true },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    status: { type: String, enum: ['Available', 'On Trip', 'Inactive'], default: 'Available' }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);

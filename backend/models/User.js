const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'fleet_owner', 'driver', 'personal'],
        default: 'personal'
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    isActive: { type: Boolean, default: true },
    profilePic: { type: String, default: "" },
    phone: { type: String, default: "" },
    dob: { type: String, default: "" },
    address: { type: String, default: "" },
    gender: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

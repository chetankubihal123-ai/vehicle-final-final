const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['Service', 'Insurance', 'Permit'], required: true },
    dueDate: { type: Date, required: true },
    isSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);

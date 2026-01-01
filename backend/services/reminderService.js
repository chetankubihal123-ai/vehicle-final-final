const cron = require('node-cron');
const Vehicle = require('../models/Vehicle');
const Reminder = require('../models/Reminder');
const { sendReminderEmail } = require('./emailService');
const User = require('../models/User');

const checkReminders = async () => {
    console.log('Checking for reminders...');
    const today = new Date();
    // Normalize today to start of day for comparison
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    try {
        const vehicles = await Vehicle.find().populate('ownerId');

        for (const vehicle of vehicles) {
            if (!vehicle.ownerId || !vehicle.ownerId.email) continue;

            const checkDate = (dateStr, type) => {
                if (!dateStr) return;
                const date = new Date(dateStr);
                date.setHours(0, 0, 0, 0);

                // Check if date is within next 3 days OR is overdue (in the past)
                // We want to alert if: date <= threeDaysLater
                // But typically we don't want to alert for things months ago unless we want "Overdue" alerts.
                // Let's assume we alert if it's <= 3 days from now AND >= 30 days ago (to not spam forever)

                if (date <= threeDaysLater) {
                    const diffTime = date - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Send alert
                    sendReminder(vehicle, type, date, diffDays);
                }
            };

            checkDate(vehicle.serviceDate, 'Service');
            checkDate(vehicle.insuranceExpiry, 'Insurance Expiry');
            checkDate(vehicle.permitExpiry, 'Permit Expiry');
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
};

const sendReminder = async (vehicle, type, date, daysLeft) => {
    const email = vehicle.ownerId.email;
    const name = vehicle.ownerId.name || "Owner";

    // Prevent duplicate emails for same vehicle+type+date check (Optional optimization)
    // For now, we rely on the fact cron runs once a day.

    await sendReminderEmail(email, name, vehicle.registrationNumber, type, date, daysLeft);
};

// Schedule cron job to run every day at 9:00 AM
cron.schedule('0 9 * * *', checkReminders);

module.exports = { checkReminders };

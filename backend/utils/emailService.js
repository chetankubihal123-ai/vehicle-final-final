const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to 'SendGrid', 'Outlook', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendTrackingAlert = async (ownerEmail, ownerName, driverName, vehicleNumber, vehicleModel) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('[EMAIL] Skipping email alert: EMAIL_USER or EMAIL_PASS not set in .env');
            return;
        }

        const mailOptions = {
            from: `"Vehicle Tracker" <${process.env.EMAIL_USER}>`,
            to: ownerEmail,
            subject: `🚨 Tracking Started: ${vehicleNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">Vehicle Tracking Alert</h2>
                    <p>Hello <strong>${ownerName}</strong>,</p>
                    <p>Driver <strong>${driverName}</strong> has just started location tracking for the following vehicle:</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${vehicleNumber} (${vehicleModel})</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <p>You can track the vehicle live on your dashboard.</p>
                    
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="https://vehicle-final-final-1.onrender.com" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Track Vehicle Now
                        </a>
                    </div>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #6b7280; text-align: center;">Vehicle Management System</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Tracking alert sent to ${ownerEmail}: ${info.messageId}`);
    } catch (error) {
        console.error('[EMAIL] Error sending email:', error);
    }
};

module.exports = {
    sendTrackingAlert
};

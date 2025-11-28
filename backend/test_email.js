require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendTestEmail = async () => {
    console.log('Attempting to send email...');
    console.log(`User: ${process.env.EMAIL_USER}`);
    // Masking password for security in logs, but printing length to ensure it's read
    console.log(`Pass length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0}`);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self
        subject: 'Test Email from Vehicle System',
        text: 'If you see this, email sending is working!'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Error sending email:');
        console.error(error);
    }
};

sendTestEmail();

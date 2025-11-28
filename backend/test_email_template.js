require('dotenv').config();
const { sendOTP } = require('./services/emailService');

// Test sending OTP email with the new template
const testEmail = async () => {
    const testOTP = '232748'; // Sample OTP from your screenshot
    const testRecipient = 'srkulkarni1969.74@gmail.com'; // Your email
    const testName = 'sampaisa'; // Your name

    console.log('Sending test OTP email...');
    console.log('To:', testRecipient);
    console.log('OTP:', testOTP);

    const result = await sendOTP(testRecipient, testOTP, testName);

    if (result) {
        console.log('✅ Test email sent successfully!');
        console.log('Check your inbox for the beautifully formatted OTP email.');
    } else {
        console.log('❌ Failed to send test email.');
    }

    process.exit(0);
};

testEmail();

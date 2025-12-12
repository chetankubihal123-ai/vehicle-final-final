// backend/services/emailService.js
const nodemailer = require("nodemailer");

// Create a Gmail transporter using your .env credentials
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// HTML template for OTP email
const createOTPEmailHTML = (otp, name = "User") => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hello ${name},</h2>
    <p>Your OTP for login is:</p>
    <h1 style="letter-spacing: 5px; color: #7c3aed;">${otp}</h1>
    <p>This OTP is valid for 10 minutes.</p>
  </div>
`;

// Send OTP email
async function sendOTP(email, otp, name) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      html: createOTPEmailHTML(otp, name),
    });

    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

module.exports = { sendOTP };

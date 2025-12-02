// backend/services/emailService.js
const { Resend } = require("resend");

// Load API key from environment
const resend = new Resend(process.env.re_fUTuXmDz_ANDEVXpsVYVxjFzC4V6NvKru);

// Simple clean OTP HTML email
const createOTPEmailHTML = (otp, name = "User") => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hello ${name},</h2>
    <p>Your OTP for login is:</p>
    <h1 style="letter-spacing: 5px; color: #7c3aed;">${otp}</h1>
    <p>This OTP is valid for 10 minutes.</p>
  </div>
`;

async function sendOTP(email, otp, name) {
  try {
    const response = await resend.emails.send({
      from: "VehicleTracker <onboarding@resend.dev>",
      to: email,
      subject: "Your OTP Code",
      html: createOTPEmailHTML(otp, name),
    });

    console.log("Email Sent:", response);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
}

module.exports = { sendOTP };

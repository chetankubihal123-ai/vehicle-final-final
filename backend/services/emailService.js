// backend/services/emailService.js
const nodemailer = require("nodemailer");

// Create a Gmail transporter using your .env credentials
const { Resend } = require("resend");

// Initialize Resend if key exists
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Initialize Nodemailer as fallback
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Fix for some dev environments
  }
});

// HTML template for OTP email
const createOTPEmailHTML = (otp, name = "User") => `
  <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 400px; margin: 0 auto;">
    <h2 style="color: #4f46e5;">VehicleTracker</h2>
    <p>Hello ${name},</p>
    <p>Your Verification Code is:</p>
    <h1 style="letter-spacing: 5px; color: #7c3aed; font-size: 32px; background: #f3f4f6; padding: 10px; border-radius: 8px;">${otp}</h1>
    <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
  </div>
`;

// Send OTP email
async function sendOTP(email, otp, name) {
  try {
    console.log(`📧 Attempting to send OTP to ${email}...`);

    // 1. Try Resend first (Highest reliability)
    if (resend) {
      try {
        const data = await resend.emails.send({
          from: "VehicleTracker <onboarding@resend.dev>", // Default testing domain
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });
        console.log("✅ Email sent via Resend:", data);
        return true;
      } catch (resendError) {
        console.warn("⚠️ Resend failed, falling back to Nodemailer:", resendError.message);
      }
    }

    // 2. Fallback to Nodemailer (Gmail)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"VehicleTracker" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: createOTPEmailHTML(otp, name),
      });
      console.log("✅ Email sent via Gmail/Nodemailer");
      return true;
    }

    console.error("❌ No email service configured (Resend or Gmail).");
    return false;

  } catch (error) {
    console.error("❌ Email send fatal error:", error);
    return false;
  }
}

module.exports = { sendOTP };

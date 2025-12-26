// backend/services/emailService.js - Updated for robust delivery
const nodemailer = require("nodemailer");

// Create a Gmail transporter using your .env credentials
const { Resend } = require("resend");

// Initialize Resend if key exists
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Initialize Nodemailer with standard Gmail settings and SHORT timeouts for Render
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 8000,
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

    // 1. Try Gmail/Nodemailer FIRST (Allows sending to any email)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"VehicleTracker" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });
        console.log("✅ Email sent via Gmail/Nodemailer");
        return true;
      } catch (gmailError) {
        console.warn(`⚠️ Gmail failed: ${gmailError.message}`);
        if (gmailError.message.includes("Invalid login")) {
          console.error("❌ ERROR: Gmail App Password is not accepted. Please verify the password in Render settings.");
        }
        console.log("Falling back to Resend if configured...");
      }
    }

    // 2. Try Resend as Fallback
    if (resend) {
      try {
        console.log("🔄 Falling back to Resend API...");
        const response = await resend.emails.send({
          from: "VehicleTracker <onboarding@resend.dev>",
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });

        if (response.error) {
          console.error("❌ Resend API Error:", response.error.message);
          if (response.error.message.includes("testing emails to your own email address")) {
            console.error("⚠️ RESEND RESTRICTION: You can only test with your own email (chetankubihal123@gmail.com) until you verify a domain or add authorized recipients.");
          }
          return false;
        }

        console.log("✅ Email sent via Resend API");
        return true;
      } catch (resendError) {
        console.error("❌ Resend Fatal Error:", resendError.message);
        return false;
      }
    }

    console.error("❌ No email service configured (Resend or Gmail).");
    return false;

  } catch (error) {
    console.error("❌ Email send fatal error:", error);
    return false;
  }
}

module.exports = { sendOTP };

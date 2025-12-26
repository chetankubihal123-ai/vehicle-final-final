// backend/services/emailService.js - Updated for robust delivery
const nodemailer = require("nodemailer");

// Create a Gmail transporter using your .env credentials
const { Resend } = require("resend");

// Initialize Resend if key exists
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Initialize Nodemailer with Brevo (Primary) - PORT 587 with STARTTLS is often more compatible
const brevoTransporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Helps in some restricted networks
  },
  connectionTimeout: 4000,
  greetingTimeout: 4000,
  socketTimeout: 5000,
});

console.log("🛠️ Email Service Status:", {
  hasBrevo: !!(process.env.BREVO_USER && process.env.BREVO_PASS),
  brevoUser: process.env.BREVO_USER ? "Present" : "Missing",
  hasGmail: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
});

// Initialize Nodemailer with standard Gmail settings (Secondary)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 4000,
  greetingTimeout: 4000,
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

    // 1. Try Brevo FIRST (Most Reliable)
    if (process.env.BREVO_USER && process.env.BREVO_PASS) {
      try {
        console.log(`🚀 Sending via Brevo to ${email}...`);
        const info = await brevoTransporter.sendMail({
          from: `"VehicleTracker" <${process.env.BREVO_USER}>`,
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });
        console.log("✅ Email sent via Brevo:", info.messageId);
        return true;
      } catch (brevoError) {
        console.error("❌ BREVO ERROR DETAIL:", {
          message: brevoError.message,
          code: brevoError.code,
          command: brevoError.command,
          response: brevoError.response
        });
      }
    }

    // 2. Try Gmail/Nodemailer SECOND
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: `"VehicleTracker" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });
        console.log("✅ Email sent via Gmail");
        return true;
      } catch (gmailError) {
        console.warn(`⚠️ Gmail failed: ${gmailError.message}`);
      }
    }

    // 3. Try Resend as Fallback
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
          return false;
        }

        console.log("✅ Email sent via Resend API");
        return true;
      } catch (resendError) {
        console.error("❌ Resend Fatal Error:", resendError.message);
        return false;
      }
    }

    console.error("❌ No email service configured (Brevo, Gmail, or Resend).");
    return false;

  } catch (error) {
    console.error("❌ SendOTP fatal error:", error.message);
    return false;
  }
}

module.exports = { sendOTP };

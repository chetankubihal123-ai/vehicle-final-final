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

    // 1. Try Brevo API (HTTP) - MOST RELIABLE ON RENDER
    if (process.env.BREVO_API_KEY) {
      try {
        console.log(`🚀 Sending via Brevo API to ${email}...`);
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sender: { name: "VehicleTracker", email: process.env.BREVO_USER || "onboarding@brevo.com" },
            to: [{ email: email }],
            subject: "Your OTP Code",
            htmlContent: createOTPEmailHTML(otp, name)
          })
        });

        const data = await response.json();
        if (response.ok) {
          console.log("✅ Email sent via Brevo API:", data.messageId);
          return true;
        } else {
          console.error("❌ Brevo API Error:", data);
        }
      } catch (brevoError) {
        console.error("❌ Brevo API Fatal Error:", brevoError.message);
      }
    }

    // 2. Try Gmail/Nodemailer SECOND (SMTP - Often blocked on Render)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        console.log("🔄 Trying Gmail SMTP...");
        await transporter.sendMail({
          from: `"VehicleTracker" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your OTP Code",
          html: createOTPEmailHTML(otp, name),
        });
        console.log("✅ Email sent via Gmail");
        return true;
      } catch (gmailError) {
        console.warn(`⚠️ Gmail SMTP failed: ${gmailError.message}`);
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

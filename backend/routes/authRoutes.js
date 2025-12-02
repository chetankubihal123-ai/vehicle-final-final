const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

router.post("/login", login);
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);

router.get("/me", auth(["admin", "fleet_owner", "driver"]), getMe);

module.exports = router;

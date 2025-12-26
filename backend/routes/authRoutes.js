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
  forgotPassword,
  resetPassword,
  updateProfile,
  updateProfilePic,
} = require("../controllers/authController");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = "uploads/profiles/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profiles/");
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images are allowed"));
  },
});

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

router.post("/login", login);
router.post("/send-login-otp", sendLoginOTP);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", auth(["admin", "fleet_owner", "driver", "personal"]), getMe);
router.put("/profile", auth(["admin", "fleet_owner", "driver", "personal"]), updateProfile);
router.post("/profile-pic", auth(["admin", "fleet_owner", "driver", "personal"]), upload.single("profilePic"), updateProfilePic);

module.exports = router;

const express = require("express");
const router = express.Router();
const { addExpense, getExpenses } = require("../controllers/expenseController");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Define storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

// Allow only images
const fileFilter = (req, file, cb) => {
  const allowed = /png|jpg|jpeg|webp/;
  const extOK = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOK = allowed.test(file.mimetype);

  if (extOK && mimeOK) cb(null, true);
  else cb(new Error("Only images allowed"), false);
};

const upload = multer({ storage, fileFilter });

// POST: Add new expense with optional receipt
router.post(
  "/",
  auth(["fleet_owner", "admin", "driver"]),
  upload.single("receipt"),
  addExpense
);

// GET: Fetch expenses
router.get(
  "/",
  auth(["fleet_owner", "admin", "driver"]),
  getExpenses
);

module.exports = router;

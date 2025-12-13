const express = require("express");
const router = express.Router();
const {
  addExpense,
  getExpenses,
  deleteExpense,
} = require("../controllers/expenseController");
const auth = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

// Upload Folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /png|jpg|jpeg|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images allowed"));
};

const upload = multer({ storage, fileFilter });

// CREATE
router.post("/", auth(["admin", "fleet_owner", "driver"]), upload.single("receipt"), addExpense);

// READ
router.get("/", auth(["admin", "fleet_owner", "driver"]), getExpenses);

// DELETE
router.delete("/:id", auth(["admin", "fleet_owner", "driver"]), deleteExpense);

module.exports = router;

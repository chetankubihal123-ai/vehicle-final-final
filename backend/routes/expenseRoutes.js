const express = require('express');
const router = express.Router();
const { addExpense, getExpenses } = require('../controllers/expenseController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// FIXED: Save uploads inside backend/uploads (correct real path)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "uploads")); 
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

// Only allow images
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
};

const upload = multer({ storage, fileFilter });

// FIXED route
router.post(
    '/',
    auth(['fleet_owner', 'admin', 'driver']),
    upload.single('receipt'),
    addExpense
);

router.get('/', auth(['fleet_owner', 'admin', 'driver']), getExpenses);

module.exports = router;

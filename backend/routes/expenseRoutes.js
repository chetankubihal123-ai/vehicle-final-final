const express = require('express');
const router = express.Router();
const { addExpense, getExpenses } = require('../controllers/expenseController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Use memory storage to store file in buffer
const storage = multer.memoryStorage();

// Only allow images
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
};

const upload = multer({ storage, fileFilter });

// POST expense with receipt
router.post(
    '/',
    auth(['fleet_owner', 'admin', 'driver']),
    upload.single('receipt'),
    addExpense
);

// GET all expenses
router.get('/', auth(['fleet_owner', 'admin', 'driver']), getExpenses);

// GET receipt image
router.get('/:id/receipt', require('../controllers/expenseController').getReceiptImage);

router.delete('/:id', auth(['fleet_owner', 'admin']), require('../controllers/expenseController').deleteExpense);

module.exports = router;

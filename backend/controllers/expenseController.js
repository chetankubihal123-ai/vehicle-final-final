const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');

// Add expense
exports.addExpense = async (req, res) => {
    try {
        const { vehicleId, type, amount, description, date } = req.body;

        let receiptUrl = '';
        if (req.file) {
            receiptUrl = `/uploads/${req.file.filename}`;
        }

        const expense = new Expense({
            vehicleId,
            type,
            amount,
            description,
            receiptUrl,
            date: date || Date.now(),
            loggedBy: req.user.id
        });

        await expense.save();
        res.status(201).json({ message: 'Expense added', expense });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get expenses
exports.getExpenses = async (req, res) => {
    try {
        let query = {};
        if (req.query.vehicleId) {
            query.vehicleId = req.query.vehicleId;
        } else if (req.user.role === 'driver') {
            query.loggedBy = req.user.id;
        } else if (req.user.role === 'fleet_owner') {
            // Owners see expenses for their vehicles
            const vehicles = await Vehicle.find({ ownerId: req.user.id }).select('_id');
            const vehicleIds = vehicles.map(v => v._id);
            query.vehicleId = { $in: vehicleIds };
        }

        const expenses = await Expense.find(query)
            .populate('vehicleId', 'registrationNumber')
            .populate('loggedBy', 'name')
            .sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// Add expense
exports.addExpense = async (req, res) => {
    try {
        const { vehicleId, type, amount, description, date } = req.body;

        let receiptUrl = "";

        // When a file is uploaded, store the full URL
        if (req.file) {
            const baseUrl = process.env.BASE_URL || "https://vehicle-final.onrender.com";
            receiptUrl = `${baseUrl}/uploads/${req.file.filename}`;
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

        res.status(201).json({
            message: "Expense added successfully",
            expense
        });

    } catch (error) {
        console.error("Expense Add Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get expenses
exports.getExpenses = async (req, res) => {
    try {
        let query = {};

        if (req.query.vehicleId) {
            query.vehicleId = req.query.vehicleId;

        } else if (req.user.role === "driver") {
            const driver = await Driver.findOne({ userId: req.user.id });
            if (driver && driver.assignedVehicle) {
                // Show ALL expenses for the assigned vehicle
                query.vehicleId = driver.assignedVehicle;
            } else {
                // Fallback to self-logged expenses
                query.loggedBy = req.user.id;
            }

        } else if (req.user.role === "fleet_owner") {
            const vehicles = await Vehicle.find({ ownerId: req.user.id }).select("_id");
            query.vehicleId = { $in: vehicles.map(v => v._id) };
        }

        const expenses = await Expense.find(query)
            .populate("vehicleId", "registrationNumber")
            .populate("loggedBy", "name")
            .sort({ date: -1 });

        res.json(expenses);

    } catch (error) {
        console.error("Expense Fetch Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Check ownership (optional, but good practice)
        // if (req.user.role !== 'admin' && expense.loggedBy.toString() !== req.user.id) {
        //     return res.status(401).json({ message: "Not authorized" });
        // }

        await Expense.findByIdAndDelete(req.params.id);

        res.json({ message: "Expense removed" });
    } catch (error) {
        console.error("Expense Delete Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

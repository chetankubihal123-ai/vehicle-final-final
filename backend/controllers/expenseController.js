const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// Add expense
exports.addExpense = async (req, res) => {
    try {
        const { vehicleId, type, amount, description, date } = req.body;

        let receiptUrl = "";
        let receiptData = null;
        let receiptContentType = "";

        // If file uploaded, store in DB and create URL
        if (req.file) {
            receiptData = req.file.buffer;
            receiptContentType = req.file.mimetype;
            // Generate virtual URL that points to our serving endpoint
            // We need the ID first, but we can construct it after saving or assume standard path
            // Better strategy: Save first, then update URL, OR just construct URL since ID is generated on save?
            // Actually, we can just construct it later in frontend, BUT to keep frontend consistent:
            // We will save empty URL first, then update. OR just set it to "PENDING"
            // Wait, standard practice:
            // baseUrl + /api/expenses/RECEIPT/<ID>
            // Let's create the object first without URL
        }

        const expense = new Expense({
            vehicleId,
            type,
            amount,
            description,
            date: date || Date.now(),
            loggedBy: req.user.id,
            receiptData,
            receiptContentType
        });

        await expense.save();

        // Update the URL now that we have the ID
        if (req.file) {
            const baseUrl = process.env.BASE_URL || "https://vehicle-final.onrender.com";
            expense.receiptUrl = `${baseUrl}/api/expenses/${expense._id}/receipt`;
            await expense.save();
        }

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
                console.log("[GET_EXPENSES] Driver found:", driver._id, "Vehicle:", driver.assignedVehicle);
                query.vehicleId = new mongoose.Types.ObjectId(driver.assignedVehicle);
            } else {
                // Fallback to self-logged expenses
                query.loggedBy = req.user.id;
            }

        } else if (req.user.role === "fleet_owner") {
            const vehicles = await Vehicle.find({ ownerId: req.user.id }).select("_id");
            query.vehicleId = { $in: vehicles.map(v => v._id) };
        }

        const expenses = await Expense.find(query)
            .select('-receiptData') // Exclude heavy image data
            .populate("vehicleId", "registrationNumber")
            .populate("loggedBy", "name")
            .sort({ date: -1 });

        res.json(expenses);

    } catch (error) {
        console.error("Expense Fetch Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Serve receipt image
exports.getReceiptImage = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense || !expense.receiptData) {
            return res.status(404).json({ message: "Image not found" });
        }

        res.set("Content-Type", expense.receiptContentType);
        res.send(expense.receiptData);

    } catch (error) {
        console.error("Image Fetch Error:", error);
        res.status(500).json({ message: "Server Error" });
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

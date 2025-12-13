const Expense = require("../models/Expense");
const Vehicle = require("../models/Vehicle");

// ADD EXPENSE
exports.addExpense = async (req, res) => {
  try {
    const { vehicleId, type, amount, description, date } = req.body;

    let receiptUrl = "";

    if (req.file) {
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      receiptUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const expense = new Expense({
      vehicleId,
      type,
      amount,
      description,
      receiptUrl,
      date: date || Date.now(),
      loggedBy: req.user.id,
    });

    await expense.save();
    res.status(201).json({ message: "Expense added", expense });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET EXPENSES
exports.getExpenses = async (req, res) => {
  try {
    let query = {};

    if (req.query.vehicleId) {
      query.vehicleId = req.query.vehicleId;
    } else if (req.user.role === "driver") {
      query.loggedBy = req.user.id;
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE EXPENSE
exports.deleteExpense = async (req, res) => {
  try {
    const id = req.params.id;

    const exp = await Expense.findById(id);
    if (!exp) return res.status(404).json({ message: "Expense not found" });

    if (req.user.role === "driver" && exp.loggedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Expense.findByIdAndDelete(id);

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

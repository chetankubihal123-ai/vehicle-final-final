const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    type: {
      type: String,
      enum: [
        "fuel",
        "maintenance",
        "insurance",
        "permit",
        "toll",
        "other",
        "service",
        "repair",
        "Fuel",
        "Toll",
        "Service",
        "Repair",
        "Other",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String },
    receiptUrl: { type: String },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);

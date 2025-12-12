import React, { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { format, parseISO } from "date-fns";

export default function ExpenseManagement() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    type: "fuel",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    receipt: null as File | null
  });

  const BACKEND = "https://vehicle-final.onrender.com";

  // FETCH VEHICLES
  useEffect(() => {
    axios.get("/vehicles").then((res) => setVehicles(res.data));
  }, []);

  // FETCH EXPENSES
  useEffect(() => {
    axios.get("/expenses").then((res) => setExpenses(res.data));
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("vehicleId", formData.vehicleId);
    fd.append("type", formData.type);
    fd.append("amount", formData.amount);
    fd.append("description", formData.description);
    fd.append("date", formData.date);
    if (formData.receipt) fd.append("receipt", formData.receipt);

    await axios.post("/expenses", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-gray-600">Track and manage vehicle expenses</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* EXPENSE LIST */}
      <div className="space-y-4">
        {expenses.map((expense: any) => (
          <div
            key={expense._id}
            className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">{expense.type}</h2>
                <p className="text-gray-600 text-sm">
                  {expense.vehicleId?.registrationNumber} •{" "}
                  {expense.loggedBy?.name} •{" "}
                  {format(parseISO(expense.date), "MMM dd, yyyy")}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold">₹{expense.amount}</p>
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {expense.type}
                </span>
              </div>
            </div>

            {expense.receiptUrl && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm text-gray-600 mb-1">Receipt:</p>
                <img
                  src={`${BACKEND}${expense.receiptUrl}`}
                  alt="receipt"
                  className="w-40 border rounded cursor-pointer"
                  onClick={() =>
                    window.open(`${BACKEND}${expense.receiptUrl}`, "_blank")
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                required
                value={formData.vehicleId}
                onChange={(e) =>
                  setFormData({ ...formData, vehicleId: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v: any) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </select>

              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="fuel">Fuel</option>
                <option value="maintenance">Maintenance</option>
                <option value="toll">Toll</option>
                <option value="other">Other</option>
              </select>

              <input
                type="number"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full p-2 border rounded"
              />

              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full p-2 border rounded"
              />

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full p-2 border rounded"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData({ ...formData, receipt: e.target.files?.[0] || null })
                }
                className="w-full p-2 border rounded"
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

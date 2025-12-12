import React, { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt as ReceiptIcon, Filter } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { Expense } from "../types";
import { format, parseISO } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

export default function ExpenseManagement() {
  const { expenses, vehicles } = useVehicles();
  const { user } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const [formData, setFormData] = useState({
    vehicle_id: "",
    category: "fuel" as Expense["category"],
    amount: 0,
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    receipt: null as File | null,
  });

  const BACKEND = "https://vehicle-final.onrender.com";

  // Auto-select vehicle if only one exists
  useEffect(() => {
    if (vehicles.length === 1) {
      setFormData((prev) => ({ ...prev, vehicle_id: vehicles[0].id }));
    }
  }, [vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("vehicleId", formData.vehicle_id);
    fd.append("type", formData.category);
    fd.append("amount", formData.amount.toString());
    fd.append("description", formData.description);
    fd.append("date", formData.expense_date);
    if (formData.receipt) fd.append("receipt", formData.receipt);

    await fetch(`${BACKEND}/api/expenses`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });

    window.location.reload();
  };

  const filteredExpenses =
    filterCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryColor = (category: Expense["category"]) => {
    switch (category) {
      case "fuel":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-green-100 text-green-800";
      case "toll":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const ExpenseCard = ({ expense }: { expense: Expense }) => {
    const vehicle = vehicles.find((v) => v.id === expense.vehicle_id);

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{expense.description}</h3>
            <p className="text-gray-600 text-sm">
              {vehicle?.vehicle_number} • {expense.logged_by_name} •{" "}
              {format(parseISO(expense.expense_date), "MMM dd, yyyy")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">₹{expense.amount}</p>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(
                expense.category
              )}`}
            >
              {expense.category}
            </span>
          </div>
        </div>

        {expense.receipt_url && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-1">Receipt:</p>
            <img
              src={`${BACKEND}${expense.receipt_url}`}
              alt="Receipt"
              className="max-w-xs rounded-lg border cursor-pointer hover:opacity-75"
              onClick={() =>
                window.open(`${BACKEND}${expense.receipt_url}`, "_blank")
              }
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and manage vehicle expenses</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl p-4 border shadow-sm flex items-center space-x-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All</option>
          <option value="fuel">Fuel</option>
          <option value="maintenance">Maintenance</option>
          <option value="toll">Toll</option>
          <option value="other">Other</option>
        </select>

        <span className="text-sm text-gray-600">
          Showing {filteredExpenses.length} expenses
        </span>
      </div>

      {/* EXPENSE LIST */}
      <div className="space-y-4">
        {filteredExpenses.map((e) => (
          <ExpenseCard key={e.id} expense={e} />
        ))}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <ReceiptIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No expenses found</p>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_id: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number}
                  </option>
                ))}
              </select>

              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as Expense["category"],
                  })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="fuel">Fuel</option>
                <option value="maintenance">Maintenance</option>
                <option value="toll">Toll</option>
                <option value="other">Other</option>
              </select>

              <input
                type="number"
                required
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
                className="w-full p-2 border rounded-lg"
              />

              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              />

              <textarea
                placeholder="Description"
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    receipt: e.target.files?.[0] || null,
                  })
                }
                className="w-full p-2 border rounded-lg"
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
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg"
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

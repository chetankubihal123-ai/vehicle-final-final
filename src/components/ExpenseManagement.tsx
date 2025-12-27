import React, { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt, Filter } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { Expense } from "../types";
import { format, parseISO } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { vehicles, expenses } = useVehicles();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);

  const [formData, setFormData] = useState({
    vehicle_id: "",
    category: "fuel",
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    receipt: null as File | null,
  });

  // Auto-fetch assigned vehicle for drivers
  useEffect(() => {
    if (user?.role === "driver") {
      // Try to find vehicle immediately from loaded vehicles
      if (user.assignedVehicle) {
        const found = vehicles.find((v) => v.id === user.assignedVehicle);
        if (found) {
          setAssignedVehicle(found);
          setFormData((prev) => ({
            ...prev,
            vehicle_id: found.id,
          }));
          return;
        }
      }

      axios.get("/drivers/me/vehicle").then((res) => {
        if (res.data.vehicle) {
          setAssignedVehicle(res.data.vehicle);
          setFormData((prev) => ({
            ...prev,
            vehicle_id: res.data.vehicle._id,
          }));
        }
      });
    }
  }, [user, vehicles.length]);

  // Auto-select vehicle if only one exists
  useEffect(() => {
    if (vehicles.length === 1) {
      setFormData((prev) => ({ ...prev, vehicle_id: vehicles[0].id }));
    }
  }, [vehicles]);

  const filteredExpenses =
    filterCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "fuel":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-green-100 text-green-800";
      case "toll":
        return "bg-orange-100 text-orange-800";
      case "insurance":
        return "bg-purple-100 text-purple-800";
      case "permit":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Submit form
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const fd = new FormData();

    fd.append("vehicleId", formData.vehicle_id);
    fd.append("type", formData.category);
    fd.append("amount", formData.amount);
    fd.append("description", formData.description);
    fd.append("date", formData.expense_date);

    if (formData.receipt) fd.append("receipt", formData.receipt);

    await axios.post("/expenses", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    window.location.reload();
  };

  // Expense Card
  const ExpenseCard = ({ expense }: { expense: Expense }) => {
    const vehicle = vehicles.find((v) => v.id === expense.vehicle_id);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${getCategoryColor(expense.category)
                .replace("text-", "bg-")
                .replace("800", "100")
                }`}
            >
              <DollarSign
                className={`h-6 w-6 ${getCategoryColor(expense.category)
                  .replace("bg-", "text-")
                  .replace("100", "600")
                  }`}
              />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {expense.description || expense.category.toUpperCase()}
              </h3>
              <p className="text-gray-600">
                {vehicle?.vehicle_number}
                {expense.logged_by_name && " • " + expense.logged_by_name}
                {" • " + format(parseISO(expense.expense_date), "MMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              ₹{expense.amount.toLocaleString()}
            </p>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(
                expense.category
              )}`}
            >
              {expense.category}
            </span>
          </div>
        </div>

        {/* FIXED RECEIPT IMAGE DISPLAY */}
        {expense.receipt_url && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Receipt:</p>

            <img
              src={expense.receipt_url} // FIXED: now uses direct URL
              alt="Receipt"
              className="max-w-xs rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
              onClick={() => window.open(expense.receipt_url, "_blank")}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Expense Management
          </h1>
          <p className="text-gray-600 mt-1">Track and manage vehicle expenses</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Fuel</p>
          <p className="text-2xl font-bold">
            ₹
            {filteredExpenses
              .filter((e) => e.category === "fuel")
              .reduce((s, e) => s + e.amount, 0)
              .toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Maintenance</p>
          <p className="text-2xl font-bold">
            ₹
            {filteredExpenses
              .filter((e) => e.category === "maintenance")
              .reduce((s, e) => s + e.amount, 0)
              .toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-600">Toll</p>
          <p className="text-2xl font-bold">
            ₹
            {filteredExpenses
              .filter((e) => e.category === "toll")
              .reduce((s, e) => s + e.amount, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center space-x-4">
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
            <option value="insurance">Insurance</option>
            <option value="permit">Permit</option>
            <option value="other">Other</option>
          </select>

          <span className="text-gray-600 text-sm">
            Showing {filteredExpenses.length} expenses
          </span>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-4">
        {filteredExpenses.map((exp) => (
          <ExpenseCard key={exp.id} expense={exp} />
        ))}

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto" />
            <p className="text-gray-600 mt-4">No expenses found</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Expense</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Vehicle Select */}
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle</label>
                {user?.role === "driver" ? (
                  (assignedVehicle || user.assignedVehicleDetails) ? (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold flex items-center justify-between">
                      <span>
                        {user.assignedVehicleDetails?.registrationNumber || assignedVehicle?.registrationNumber} - {user.assignedVehicleDetails?.make || assignedVehicle?.make} {user.assignedVehicleDetails?.model || assignedVehicle?.model}
                      </span>
                      <span className="text-xs text-purple-600 font-bold uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded">Assigned</span>
                    </div>
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
                      <span>Loading assigned vehicle...</span>
                    </div>
                  )
                ) : (
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_number} – {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="fuel">Fuel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="toll">Toll</option>
                  <option value="insurance">Insurance</option>
                  <option value="permit">Permit</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expense_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bill Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      receipt: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-purple-600 text-white"
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

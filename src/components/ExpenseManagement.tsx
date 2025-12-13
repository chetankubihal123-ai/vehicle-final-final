import React, { useState, useEffect } from "react";
import { Plus, DollarSign, Receipt, Filter, Trash } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { Expense } from "../types";
import { format, parseISO } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { vehicles, expenses, refreshData } = useVehicles();

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

  // Driver vehicle auto-fill
  useEffect(() => {
    if (user?.role === "driver") {
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
  }, [user]);

  // Filter
  const filteredExpenses =
    filterCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  // Submit add expense
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const fd = new FormData();

    fd.append("vehicleId", formData.vehicle_id);
    fd.append("type", formData.category);
    fd.append("amount", formData.amount);
    fd.append("description", formData.description);
    fd.append("date", formData.expense_date);

    if (formData.receipt) fd.append("receipt", formData.receipt);

    await axios.post("/api/expenses", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setShowAddModal(false);
    refreshData();
  };

  // DELETE EXPENSE
  const deleteExpense = async (id: string) => {
    await axios.delete(`/api/expenses/${id}`);
    refreshData(); // instantly refresh UI
  };

  // Expense Card
  const ExpenseCard = ({ expense }: { expense: Expense }) => {
    const vehicle = vehicles.find((v) => v.id === expense.vehicle_id);

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 relative">
        {/* Delete Button */}
        <button
          onClick={() => deleteExpense(expense.id)}
          className="absolute top-4 right-4 text-red-600 hover:text-red-800"
        >
          <Trash className="h-5 w-5" />
        </button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-purple-600" />

            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {expense.description}
              </h3>
              <p className="text-gray-600">
                {vehicle?.vehicle_number}
                {" • " + expense.logged_by_name}
                {" • " + format(parseISO(expense.expense_date), "MMM dd, yyyy")}
              </p>
            </div>
          </div>

          <p className="text-xl font-bold text-gray-900">
            ₹{expense.amount.toLocaleString()}
          </p>
        </div>

        {expense.receipt_url && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">Receipt:</p>

            <img
              src={expense.receipt_url}
              className="max-w-xs rounded-lg border cursor-pointer"
              onClick={() => window.open(expense.receipt_url, "_blank")}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* header omitted for brevity */}
      {/* list */}
      <div className="space-y-4">
        {filteredExpenses.map((e) => (
          <ExpenseCard key={e.id} expense={e} />
        ))}
      </div>
    </div>
  );
}

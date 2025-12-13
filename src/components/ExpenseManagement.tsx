import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Receipt, Filter } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { Expense } from '../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { vehicles, expenses } = useVehicles();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    vehicle_id: '',
    category: 'fuel' as Expense['category'],
    amount: 0,
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipt: null as File | null,
  });
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);

  // Fetch assigned vehicle for drivers
  useEffect(() => {
    if (user?.role === 'driver') {
      const fetchMyVehicle = async () => {
        try {
          const res = await axios.get('/drivers/me/vehicle');
          if (res.data.vehicle) {
            setAssignedVehicle(res.data.vehicle);
            setFormData(prev => ({ ...prev, vehicle_id: res.data.vehicle._id }));
          }
        } catch (err) {
          console.error('Error fetching assigned vehicle:', err);
        }
      };
      fetchMyVehicle();
    }
  }, [user]);

  useEffect(() => {
    if (vehicles.length === 1) {
      setFormData(prev => ({ ...prev, vehicle_id: vehicles[0].id }));
    }
  }, [vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('vehicleId', formData.vehicle_id);
      formDataToSend.append('type', formData.category);
      formDataToSend.append('amount', formData.amount.toString());
      formDataToSend.append('description', formData.description);
      formDataToSend.append('date', formData.expense_date);

      if (formData.receipt) {
        formDataToSend.append('receipt', formData.receipt);
      }

      await axios.post('/expenses', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh expenses
      window.location.reload();
    } catch (error) {
      console.error('Error adding expense:', error);
    }

    setShowAddModal(false);
    setFormData({
      vehicle_id: '',
      category: 'fuel',
      amount: 0,
      description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      receipt: null,
    });
  };

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(expense => expense.category === filterCategory);

  const getCategoryColor = (category: Expense['category']) => {
    switch (category) {
      case 'fuel': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-green-100 text-green-800';
      case 'insurance': return 'bg-purple-100 text-purple-800';
      case 'permit': return 'bg-yellow-100 text-yellow-800';
      case 'toll': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: Expense['category']) => {
    return DollarSign; // Using same icon for simplicity
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const ExpenseCard = ({ expense }: { expense: Expense }) => {
    const vehicle = vehicles.find(v => v.id === expense.vehicle_id);
    const Icon = getCategoryIcon(expense.category);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getCategoryColor(expense.category).replace('text-', 'bg-').replace('800', '100')}`}>
              <Icon className={`h-6 w-6 ${getCategoryColor(expense.category).replace('bg-', 'text-').replace('100', '600')}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{expense.description}</h3>
              <p className="text-gray-600">
                {vehicle?.vehicle_number}
                {expense.logged_by_name && ` • ${expense.logged_by_name}`}
                {` • ${format(parseISO(expense.expense_date), 'MMM dd, yyyy')}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">₹{expense.amount.toLocaleString()}</p>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(expense.category)}`}>
              {expense.category}
            </span>
          </div>
        </div>

        {expense.receipt_url && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Receipt:</p>
            <img
              src={`http://localhost:5000${expense.receipt_url}`}
              alt="Receipt"
              className="max-w-xs rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
              onClick={() => window.open(`http://localhost:5000${expense.receipt_url}`, '_blank')}
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
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">Track and manage vehicle expenses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Expense Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Fuel Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{expenses.filter(e => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{expenses.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Average/Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{Math.round(totalExpenses / Math.max(1, new Set(expenses.map(e => format(parseISO(e.expense_date), 'yyyy-MM'))).size)).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            <option value="fuel">Fuel</option>
            <option value="maintenance">Maintenance</option>
            <option value="insurance">Insurance</option>
            <option value="permit">Permit</option>
            <option value="toll">Toll</option>
            <option value="other">Other</option>
          </select>
          <div className="text-sm text-gray-600">
            Showing {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            {filterCategory !== 'all' && ` for ${filterCategory}`}
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-4">
        {filteredExpenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} />
        ))}
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No expenses found</p>
            <p className="text-gray-400">
              {filterCategory === 'all'
                ? 'Click "Add Expense" to get started'
                : `No ${filterCategory} expenses found`}
            </p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle
                  </label>
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={user?.role === 'driver' && assignedVehicle}
                  >
                    <option value="">Select a vehicle</option>
                    {user?.role === 'driver' && assignedVehicle ? (
                      <option value={assignedVehicle._id}>
                        {assignedVehicle.registrationNumber} - {assignedVehicle.make} {assignedVehicle.model}
                      </option>
                    ) : (
                      vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="fuel">Fuel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="insurance">Insurance</option>
                    <option value="permit">Permit</option>
                    <option value="toll">Toll</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Fuel refill at highway petrol pump"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFormData({ ...formData, receipt: e.target.files[0] });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
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
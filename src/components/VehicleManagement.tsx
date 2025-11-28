import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Car, Truck, Bus, Bike, Circle } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { Vehicle } from '../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import VehicleAutocomplete from './VehicleAutocomplete';
import { vehicleTypes, vehicleMakes, vehicleModels } from '../data/vehicleData';

export default function VehicleManagement() {
  const { user } = useAuth();
  const { vehicles, addVehicle } = useVehicles();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    vehicle_type: 'Car',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    fuel_type: 'petrol' as Vehicle['fuel_type'],
    current_mileage: 0,
    insurance_expiry: '',
    service_due_date: '',
    permit_expiry: '',
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Update available models when make changes
  React.useEffect(() => {
    if (formData.make && vehicleModels[formData.make]) {
      setAvailableModels(vehicleModels[formData.make]);
    } else {
      setAvailableModels([]);
    }
  }, [formData.make]);

  const getVehicleIcon = (type: Vehicle['vehicle_type']) => {
    switch (type.toLowerCase()) {
      case 'car': return Car;
      case 'truck': return Truck;
      case 'bus': return Bus;
      case 'two_wheeler': return Bike;
      default: return Car;
    }
  };

  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'maintenance': return 'text-yellow-500';
      case 'inactive': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    addVehicle({
      ...formData,
      owner_id: user.id,
      status: 'active',
    });

    setShowAddModal(false);
    setFormData({
      vehicle_number: '',
      vehicle_type: 'Car',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      fuel_type: 'petrol',
      current_mileage: 0,
      insurance_expiry: '',
      service_due_date: '',
      permit_expiry: '',
    });
  };

  const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {
    const Icon = getVehicleIcon(vehicle.vehicle_type);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{vehicle.vehicle_number}</h3>
              <p className="text-gray-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Circle className={`h-3 w-3 ${getStatusColor(vehicle.status)} fill-current`} />
            <span className={`text-sm font-medium capitalize ${getStatusColor(vehicle.status)}`}>
              {vehicle.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Fuel Type</p>
            <p className="font-medium text-gray-900 capitalize">{vehicle.fuel_type}</p>
          </div>
          <div>
            <p className="text-gray-500">Current Mileage</p>
            <p className="font-medium text-gray-900">{vehicle.current_mileage.toLocaleString()} km</p>
          </div>
          <div>
            <p className="text-gray-500">Insurance Expiry</p>
            <p className="font-medium text-gray-900">
              {vehicle.insurance_expiry ? format(parseISO(vehicle.insurance_expiry), 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Next Service</p>
            <p className="font-medium text-gray-900">
              {vehicle.service_due_date ? format(parseISO(vehicle.service_due_date), 'MMM dd, yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
          <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
          <p className="text-gray-600 mt-1">Manage your fleet vehicles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No vehicles added yet</p>
            <p className="text-gray-400">Click "Add Vehicle" to get started</p>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Add New Vehicle</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., MH12AB1234"
                  />
                </div>

                <div>
                  <VehicleAutocomplete
                    label="Vehicle Type"
                    value={formData.vehicle_type}
                    onChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                    options={vehicleTypes}
                    placeholder="Select Type"
                    required
                  />
                </div>

                <div>
                  <VehicleAutocomplete
                    label="Make"
                    value={formData.make}
                    onChange={(value) => setFormData({ ...formData, make: value, model: '' })} // Reset model on make change
                    options={vehicleMakes}
                    placeholder="Select Make"
                    required
                  />
                </div>

                <div>
                  <VehicleAutocomplete
                    label="Model"
                    value={formData.model}
                    onChange={(value) => setFormData({ ...formData, model: value })}
                    options={availableModels}
                    placeholder={availableModels.length > 0 ? "Select Model" : "Type Model"}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    required
                    min="1990"
                    max={new Date().getFullYear()}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as Vehicle['fuel_type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Mileage (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.current_mileage}
                    onChange={(e) => setFormData({ ...formData, current_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Expiry
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.service_due_date}
                    onChange={(e) => setFormData({ ...formData, service_due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permit Expiry (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.permit_expiry}
                    onChange={(e) => setFormData({ ...formData, permit_expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
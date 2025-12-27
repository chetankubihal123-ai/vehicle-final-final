import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, Car, Navigation, Edit } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { Trip } from '../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import VehicleTracker from './VehicleTracker';
import axios from 'axios';
import LocationAutocomplete from './LocationAutocomplete';


export default function TripTracking() {
  const { user } = useAuth();
  const { vehicles, trips, addTrip } = useVehicles();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedVehicleForTracking, setSelectedVehicleForTracking] = useState<string>('');
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    start_location: '',
    start_location_lat: '',
    start_location_lon: '',
    end_location: '',
    end_location_lat: '',
    end_location_lon: '',
    start_mileage: 0,
    end_mileage: 0,
    trip_date: format(new Date(), 'yyyy-MM-dd'),
    fuel_consumed: 0,
    goods_carried: '',
    trip_purpose: '',
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  // Filter trips
  const filteredTrips = trips.filter(trip => {
    if (filterDate && !trip.trip_date.includes(filterDate)) return false;
    if (filterDriver && trip.driver_name && !trip.driver_name.toLowerCase().includes(filterDriver.toLowerCase())) return false;
    if (filterVehicle) {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      if (!vehicle?.vehicle_number.toLowerCase().includes(filterVehicle.toLowerCase())) return false;
    }
    return true;
  });

  // Auto-fetch assigned vehicle for drivers
  useEffect(() => {
    if (user?.role === 'driver') {
      // Try to find vehicle immediately from loaded vehicles
      if (user.assignedVehicle) {
        const found = vehicles.find(v => v.id === user.assignedVehicle);
        if (found) {
          setAssignedVehicle(found);
          setSelectedVehicleForTracking(found.id);
          setFormData(prev => ({ ...prev, vehicle_id: found.id }));
          return;
        }
      }

      // Fallback: fetch from API if not found (or if user.assignedVehicle is missing but DB has it)
      const fetchMyVehicle = async () => {
        try {
          const res = await axios.get('/drivers/me/vehicle');
          if (res.data.vehicle) {
            setAssignedVehicle(res.data.vehicle);
            setSelectedVehicleForTracking(res.data.vehicle._id);
            setFormData(prev => ({ ...prev, vehicle_id: res.data.vehicle._id }));
          }
        } catch (err) {
          console.error('Error fetching assigned vehicle:', err);
        }
      };

      // Only fetch if we couldn't find it locally
      if (!assignedVehicle) {
        fetchMyVehicle();
      }
    }
  }, [user, vehicles.length]); // Add vehicles.length dependency to retry calculation when vehicles load

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    addTrip({
      ...formData,
      driver_id: user.id,
      start_location_lat: formData.start_location_lat,
      start_location_lon: formData.start_location_lon,
      end_location_lat: formData.end_location_lat,
      end_location_lon: formData.end_location_lon,
    });

    setShowAddModal(false);
    setFormData({
      vehicle_id: '',
      start_location: '',
      start_location_lat: '',
      start_location_lon: '',
      end_location: '',
      end_location_lat: '',
      end_location_lon: '',
      start_mileage: 0,
      end_mileage: 0,
      trip_date: format(new Date(), 'yyyy-MM-dd'),
      fuel_consumed: 0,
      goods_carried: '',
      trip_purpose: '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTrip) return;

    try {
      await axios.put(`/trips/${editingTrip.id}`, {
        vehicleId: formData.vehicle_id,
        startLocation: formData.start_location,
        startLocationLat: formData.start_location_lat,
        startLocationLon: formData.start_location_lon,
        endLocation: formData.end_location,
        endLocationLat: formData.end_location_lat,
        endLocationLon: formData.end_location_lon,
        startMileage: formData.start_mileage,
        endMileage: formData.end_mileage,
        tripDate: formData.trip_date,
        fuelConsumed: formData.fuel_consumed,
        purpose: formData.trip_purpose,
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating trip:', error);
    }

    setShowEditModal(false);
    setEditingTrip(null);
  };

  const TripCard = ({ trip }: { trip: Trip }) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
    const distance = trip.end_mileage - trip.start_mileage;
    const efficiency = trip.fuel_consumed ? (distance / trip.fuel_consumed).toFixed(1) : null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {trip.start_location} → {trip.end_location}
              </h3>
              <p className="text-gray-600">
                {vehicle?.vehicle_number}
                {trip.driver_name && ` • ${trip.driver_name}`}
                {` • ${format(parseISO(trip.trip_date), 'MMM dd, yyyy')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {distance} km
            </span>
            <button
              onClick={() => {
                setEditingTrip(trip);
                setFormData({
                  vehicle_id: trip.vehicle_id,
                  start_location: trip.start_location,
                  start_location_lat: '',
                  start_location_lon: '',
                  end_location: trip.end_location,
                  end_location_lat: '',
                  end_location_lon: '',
                  start_mileage: trip.start_mileage,
                  end_mileage: trip.end_mileage,
                  trip_date: trip.trip_date.split('T')[0],
                  fuel_consumed: trip.fuel_consumed || 0,
                  goods_carried: trip.goods_carried || '',
                  trip_purpose: trip.trip_purpose,
                });
                setShowEditModal(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Trip"
            >
              <Edit className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Start Mileage</p>
            <p className="font-medium text-gray-900">{trip.start_mileage.toLocaleString()} km</p>
          </div>
          <div>
            <p className="text-gray-500">End Mileage</p>
            <p className="font-medium text-gray-900">{trip.end_mileage.toLocaleString()} km</p>
          </div>
          {trip.fuel_consumed && (
            <div>
              <p className="text-gray-500">Fuel Used</p>
              <p className="font-medium text-gray-900">{trip.fuel_consumed}L</p>
            </div>
          )}
          {efficiency && (
            <div>
              <p className="text-gray-500">Efficiency</p>
              <p className="font-medium text-gray-900">{efficiency} km/L</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {trip.trip_purpose && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Navigation className="h-4 w-4" />
                <span>{trip.trip_purpose}</span>
              </div>
            )}
            {trip.goods_carried && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Car className="h-4 w-4" />
                <span>{trip.goods_carried}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Tracking</h1>
          <p className="text-gray-600 mt-1">Track and manage vehicle trips</p>
        </div>

        <div className="flex gap-3">
          {user?.role !== 'driver' && (
            <button
              onClick={() => setShowTrackModal(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Navigation className="h-5 w-5" />
              <span>Track Vehicle</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Log Trip</span>
          </button>
        </div>
      </div>

      {/* Trip Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{trips.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Distance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {trips.reduce((sum, trip) => sum + (trip.end_mileage - trip.start_mileage), 0).toLocaleString()} km
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Car className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Fuel Consumed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {trips.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0)}L
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

      </div>

      {/* Filters - Only show for fleet owners */}
      {user?.role === 'fleet_owner' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Driver</label>
              <input
                type="text"
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                placeholder="Search driver name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Vehicle</label>
              <input
                type="text"
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                placeholder="Search vehicle number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredTrips.length} of {trips.length} trips
          </div>
        </div>
      )}

      {/* Trip List */}
      <div className="space-y-4">
        {filteredTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {filteredTrips.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No trips found</p>
            <p className="text-gray-400">
              {trips.length === 0 ? 'Click "Log Trip" to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>

      {/* Add Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Log New Trip</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle
                  </label>
                  {user?.role === 'driver' && assignedVehicle ? (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold flex items-center justify-between">
                      <span>{assignedVehicle.registrationNumber} - {assignedVehicle.make} {assignedVehicle.model}</span>
                      <span className="text-xs text-purple-600 font-bold uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded">Assigned</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <LocationAutocomplete
                    label="Start Location"
                    value={formData.start_location}
                    onChange={(location, lat, lon) => {
                      setFormData({
                        ...formData,
                        start_location: location,
                        start_location_lat: lat || '',
                        start_location_lon: lon || '',
                      });
                    }}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>

                <div>
                  <LocationAutocomplete
                    label="End Location"
                    value={formData.end_location}
                    onChange={(location, lat, lon) => {
                      setFormData({
                        ...formData,
                        end_location: location,
                        end_location_lat: lat || '',
                        end_location_lon: lon || '',
                      });
                    }}
                    placeholder="e.g., Pune"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Mileage (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.start_mileage}
                    onChange={(e) => setFormData({ ...formData, start_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Mileage (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.end_mileage}
                    onChange={(e) => setFormData({ ...formData, end_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.trip_date}
                    onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Consumed (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.fuel_consumed}
                    onChange={(e) => setFormData({ ...formData, fuel_consumed: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Purpose
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trip_purpose}
                    onChange={(e) => setFormData({ ...formData, trip_purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Delivery, Commute"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goods Carried (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.goods_carried}
                    onChange={(e) => setFormData({ ...formData, goods_carried: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., Electronics, Documents"
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
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Log Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {showEditModal && editingTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Edit Trip</h2>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle
                  </label>
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  <LocationAutocomplete
                    label="Start Location"
                    value={formData.start_location}
                    onChange={(location, lat, lon) => {
                      setFormData({
                        ...formData,
                        start_location: location,
                        start_location_lat: lat || '',
                        start_location_lon: lon || '',
                      });
                    }}
                    required
                  />
                </div>

                <div>
                  <LocationAutocomplete
                    label="End Location"
                    value={formData.end_location}
                    onChange={(location, lat, lon) => {
                      setFormData({
                        ...formData,
                        end_location: location,
                        end_location_lat: lat || '',
                        end_location_lon: lon || '',
                      });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Mileage (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.start_mileage}
                    onChange={(e) => setFormData({ ...formData, start_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Mileage (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.end_mileage}
                    onChange={(e) => setFormData({ ...formData, end_mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.trip_date}
                    onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Consumed (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.fuel_consumed}
                    onChange={(e) => setFormData({ ...formData, fuel_consumed: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Purpose
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.trip_purpose}
                    onChange={(e) => setFormData({ ...formData, trip_purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goods Carried (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.goods_carried}
                    onChange={(e) => setFormData({ ...formData, goods_carried: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTrip(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Update Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Track Vehicle Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-indigo-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-semibold text-white">Track Vehicle Live</h2>
                </div>
                <button
                  onClick={() => {
                    setShowTrackModal(false);
                    setSelectedVehicleForTracking('');
                  }}
                  className="text-white hover:text-gray-200 transition"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Vehicle Selection */}
              {!selectedVehicleForTracking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle to Track
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={selectedVehicleForTracking}
                    onChange={(e) => setSelectedVehicleForTracking(e.target.value)}
                  >
                    <option value="">Choose a vehicle...</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vehicle Tracker Component */}
              {selectedVehicleForTracking ? (
                <>
                  <VehicleTracker
                    vehicleId={selectedVehicleForTracking}
                    vehicleName={
                      vehicles.find((v) => v.id === selectedVehicleForTracking)
                        ?.vehicle_number || 'Unknown Vehicle'
                    }
                    onSaveTrip={(tripData) => {
                      setShowTrackModal(false);
                      setFormData({
                        ...formData,
                        vehicle_id: selectedVehicleForTracking,
                        start_location: tripData.startLocation,
                        end_location: tripData.endLocation,
                        trip_date: format(tripData.startTime, 'yyyy-MM-dd'),
                        start_mileage: 0, // In a real app, fetch last mileage
                        end_mileage: Math.round(tripData.distance), // This would be start + distance
                      });
                      setShowAddModal(true);
                      setSelectedVehicleForTracking('');
                    }}
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setSelectedVehicleForTracking('')}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                      Change Vehicle
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-12 border-2 border-dashed border-purple-300">
                  <div className="text-center">
                    <Navigation className="h-20 w-20 text-purple-500 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Select a Vehicle to Start Tracking
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Choose a vehicle from the dropdown above to view its live location
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Real-time Location</p>
                        <p className="text-sm text-gray-600 mt-1">Live GPS coordinates</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <Navigation className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Trip Recording</p>
                        <p className="text-sm text-gray-600 mt-1">Auto-calculate distance</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <Car className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-900">Live Dashboard</p>
                        <p className="text-sm text-gray-600 mt-1">Visual map interface</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
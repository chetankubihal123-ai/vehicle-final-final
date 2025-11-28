import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, UserCheck, UserX, Car } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface Driver {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    licenseNumber: string;
    assignedVehicle?: {
        _id: string;
        vehicle_number: string;
        make: string;
        model: string;
    };
    status: 'Available' | 'On Trip' | 'Inactive';
    createdAt: string;
}

interface Vehicle {
    _id: string;
    vehicle_number: string;
    make: string;
    model: string;
    status: string;
}

export default function DriverManagement() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        licenseNumber: '',
        assignedVehicle: '',
        status: 'Available' as 'Available' | 'On Trip' | 'Inactive',
    });

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchDrivers();
        fetchVehicles();
    }, []);

    const fetchDrivers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/drivers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDrivers(response.data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVehicles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/vehicles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVehicles(response.data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (editingDriver) {
                // Update existing driver
                await axios.put(
                    `${API_URL}/drivers/${editingDriver._id}`,
                    {
                        licenseNumber: formData.licenseNumber,
                        assignedVehicle: formData.assignedVehicle || null,
                        status: formData.status,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                // Create new driver
                await axios.post(
                    `${API_URL}/drivers`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            fetchDrivers();
            resetForm();
            setShowModal(false);
        } catch (error: any) {
            console.error('Error saving driver:', error);
            alert(error.response?.data?.message || 'Error saving driver');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this driver?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/drivers/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchDrivers();
        } catch (error) {
            console.error('Error deleting driver:', error);
            alert('Error deleting driver');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            licenseNumber: '',
            assignedVehicle: '',
            status: 'Available',
        });
        setEditingDriver(null);
    };

    const openEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        setFormData({
            name: driver.userId.name,
            email: driver.userId.email,
            password: '',
            licenseNumber: driver.licenseNumber,
            assignedVehicle: driver.assignedVehicle?._id || '',
            status: driver.status,
        });
        setShowModal(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Available':
                return <UserCheck className="h-5 w-5 text-green-500" />;
            case 'On Trip':
                return <User className="h-5 w-5 text-blue-500" />;
            case 'Inactive':
                return <UserX className="h-5 w-5 text-gray-400" />;
            default:
                return <User className="h-5 w-5" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 text-green-800';
            case 'On Trip':
                return 'bg-blue-100 text-blue-800';
            case 'Inactive':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Driver Management</h1>
                    <p className="text-gray-500 mt-1">Manage your drivers and vehicle assignments</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Add Driver
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    whileHover={{ translateY: -4 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Available Drivers</p>
                            <p className="text-3xl font-bold mt-1">
                                {drivers.filter((d) => d.status === 'Available').length}
                            </p>
                        </div>
                        <UserCheck className="h-12 w-12 opacity-80" />
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ translateY: -4 }}
                    className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">On Trip</p>
                            <p className="text-3xl font-bold mt-1">
                                {drivers.filter((d) => d.status === 'On Trip').length}
                            </p>
                        </div>
                        <User className="h-12 w-12 opacity-80" />
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ translateY: -4 }}
                    className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Total Drivers</p>
                            <p className="text-3xl font-bold mt-1">{drivers.length}</p>
                        </div>
                        <User className="h-12 w-12 opacity-80" />
                    </div>
                </motion.div>
            </div>

            {/* Drivers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drivers.map((driver) => (
                    <motion.div
                        key={driver._id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition-all overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-full">
                                        {getStatusIcon(driver.status)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">
                                            {driver.userId.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">{driver.userId.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">License:</span>
                                    <span className="font-semibold text-gray-900">
                                        {driver.licenseNumber}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                            driver.status
                                        )}`}
                                    >
                                        {driver.status}
                                    </span>
                                </div>

                                {driver.assignedVehicle ? (
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Car className="h-4 w-4 text-blue-600" />
                                            <span className="text-xs font-semibold text-blue-900">
                                                Assigned Vehicle
                                            </span>
                                        </div>
                                        <p className="font-bold text-blue-900">
                                            {driver.assignedVehicle.vehicle_number}
                                        </p>
                                        <p className="text-xs text-blue-700">
                                            {driver.assignedVehicle.make} {driver.assignedVehicle.model}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <p className="text-sm text-gray-500 text-center">
                                            No vehicle assigned
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                <button
                                    onClick={() => openEditModal(driver)}
                                    className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2 font-medium"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(driver._id)}
                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-2 font-medium"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {drivers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border">
                    <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Drivers Yet</h3>
                    <p className="text-gray-500 mb-6">Get started by adding your first driver</p>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition"
                    >
                        Add Your First Driver
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-violet-600">
                            <h2 className="text-2xl font-bold text-white">
                                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!editingDriver && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Driver Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Enter driver name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="driver@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Password *
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    License Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.licenseNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, licenseNumber: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="DL1234567890"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Assign Vehicle
                                </label>
                                <select
                                    value={formData.assignedVehicle}
                                    onChange={(e) =>
                                        setFormData({ ...formData, assignedVehicle: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">No Vehicle Assigned</option>
                                    {vehicles.map((vehicle) => (
                                        <option key={vehicle._id} value={vehicle._id}>
                                            {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Status *
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as 'Available' | 'On Trip' | 'Inactive',
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Available">Available</option>
                                    <option value="On Trip">On Trip</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:opacity-90 transition font-semibold shadow-lg"
                                >
                                    {editingDriver ? 'Update Driver' : 'Add Driver'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

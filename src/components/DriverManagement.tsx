import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, User, UserCheck, UserX, Car } from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";
import { API_URL } from "../config";

axios.defaults.baseURL = `${API_URL}/api`; // USE RENDER URL
axios.defaults.withCredentials = true;

interface Driver {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    profilePic?: string;
  };
  licenseNumber: string;
  assignedVehicle?: {
    _id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
  status: "Available" | "On Trip" | "Inactive";
  createdAt: string;
}

interface Vehicle {
  _id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    licenseNumber: "",
    assignedVehicle: "",
    status: "Available" as "Available" | "On Trip" | "Inactive",
    profilePic: "",
  });

  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await axios.get("/drivers");
      setDrivers(res.data);
    } catch (err) {
      console.error("Error fetching drivers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await axios.get("/vehicles");
      setVehicles(res.data);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: any = {
        licenseNumber: formData.licenseNumber,
        assignedVehicle: formData.assignedVehicle || null,
        status: formData.status,
        profilePic: formData.profilePic,
        name: formData.name, // Allow updating name
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (!editingDriver) {
        payload.name = formData.name;
        payload.email = formData.email;
        // payload.password is set above if provided (required by form for new users)

        await axios.post("/drivers", payload);
      } else {
        await axios.put(`/drivers/${editingDriver._id}`, payload);
      }

      fetchDrivers();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      console.error("Error saving driver:", err);
      alert(err.response?.data?.message || "Error saving driver");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;

    try {
      await axios.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      console.error("Error deleting driver:", err);
      alert("Error deleting driver");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      licenseNumber: "",
      assignedVehicle: "",
      status: "Available",
      profilePic: "",
    });
    setEditingDriver(null);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.userId.name,
      email: driver.userId.email,
      password: "",
      licenseNumber: driver.licenseNumber,
      assignedVehicle: driver.assignedVehicle?._id || "",
      status: driver.status,
      profilePic: driver.userId.profilePic || "",
    });
    setShowModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Available":
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case "On Trip":
        return <User className="h-5 w-5 text-blue-500" />;
      case "Inactive":
        return <UserX className="h-5 w-5 text-gray-400" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "On Trip":
        return "bg-blue-100 text-blue-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold">Driver Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg"
        >
          <Plus className="h-5 w-5" /> Add Driver
        </button>
      </div>

      {/* DRIVER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <motion.div
            key={driver._id}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-md p-6 border"
          >
            <div className="flex items-center gap-4">
              <img
                src={driver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.userId.name}&mood[]=smiling&backgroundType[]=gradientLinear,gradientMesh`}
                alt={driver.userId.name}
                className="w-12 h-12 rounded-full border shadow-sm object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg truncate">{driver.userId.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{driver.userId.email}</p>
                  </div>
                  {getStatusIcon(driver.status)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-gray-700">License: {driver.licenseNumber}</div>
              <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs ${getStatusColor(driver.status)}`}>
                {driver.status}
              </div>

              {driver.assignedVehicle ? (
                <div className="mt-3 p-3 bg-blue-50 border rounded-lg">
                  <Car className="h-4 w-4 text-blue-600" />
                  <p className="font-bold">{driver.assignedVehicle.registrationNumber}</p>
                  <p className="text-xs">{driver.assignedVehicle.make} {driver.assignedVehicle.model}</p>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-gray-100 border rounded-lg text-center text-gray-500">
                  No vehicle assigned
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openEditModal(driver)}
                className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={() => handleDelete(driver._id)}
                className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6"
          >
            <h2 className="text-xl font-bold mb-4">
              {editingDriver ? "Edit Driver" : "Add New Driver"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingDriver && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Driver Name"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </>
              )}

              {editingDriver && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Driver Name"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="New Password (leave blank to keep)"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </>
              )}

              <input
                type="text"
                placeholder="Profile Picture URL (Optional)"
                className="input"
                value={formData.profilePic}
                onChange={(e) => setFormData({ ...formData, profilePic: e.target.value })}
              />

              <input
                type="text"
                required
                placeholder="License Number"
                className="input"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />

              <select
                className="input"
                value={formData.assignedVehicle}
                onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
              >
                <option value="">No Vehicle Assigned</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Inactive">Inactive</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg">
                  {editingDriver ? "Update Driver" : "Add Driver"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

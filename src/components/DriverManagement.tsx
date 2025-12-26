import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  User,
  UserCheck,
  UserX,
  Car,
  Mail,
  Lock,
  CreditCard,
  Shield,
  Camera,
  X,
  Check,
  ChevronDown
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {drivers.map((driver) => (
          <motion.div
            key={driver._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-300 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-gray-50 flex items-center justify-center">
                      <img
                        src={driver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.userId.name}&mood[]=smiling&backgroundType[]=gradientLinear,gradientMesh`}
                        alt={driver.userId.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-lg shadow-md border border-gray-50">
                      {getStatusIcon(driver.status)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {driver.userId.name}
                    </h3>
                    <div className="flex items-center text-gray-500 gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5" />
                      <p className="text-sm truncate">{driver.userId.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100/50">
                    <CreditCard className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-gray-600 tracking-wider uppercase">
                      DL: {driver.licenseNumber}
                    </span>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(driver.status)} shadow-sm ring-1 ring-inset ring-current/10`}>
                    {driver.status}
                  </div>
                </div>

                {driver.assignedVehicle ? (
                  <div className="relative group/vehicle bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-4 rounded-2xl border border-indigo-100/50 overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Car className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Assignment</span>
                      </div>
                      <p className="text-base font-black text-indigo-900 leading-none">
                        {driver.assignedVehicle.registrationNumber}
                      </p>
                      <p className="text-xs font-medium text-indigo-600/70 mt-1 uppercase tracking-wider">
                        {driver.assignedVehicle.make} {driver.assignedVehicle.model}
                      </p>
                    </div>
                    <Car className="absolute -right-4 -bottom-4 h-24 w-24 text-indigo-200/20 group-hover/vehicle:scale-110 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 group-hover:border-indigo-200 transition-colors">
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Car className="h-4 w-4 text-gray-400 group-hover:text-indigo-400" />
                    </div>
                    <p className="text-xs font-medium text-gray-400 group-hover:text-indigo-400">Unassigned</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex border-t border-gray-50 bg-gray-50/30">
              <button
                onClick={() => openEditModal(driver)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-indigo-600 hover:bg-white font-bold text-sm transition-all border-r border-gray-50 group/edit"
              >
                <div className="p-1.5 bg-indigo-50 rounded-lg group-hover/edit:scale-110 transition-transform">
                  <Edit2 className="h-4 w-4" />
                </div>
                Edit Details
              </button>
              <button
                onClick={() => handleDelete(driver._id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-red-500 hover:bg-white font-bold text-sm transition-all group/del"
              >
                <div className="p-1.5 bg-red-50 rounded-lg group-hover/del:scale-110 transition-transform">
                  <Trash2 className="h-4 w-4" />
                </div>
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-8 pt-10 pb-16 relative">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-white/10 rounded-3xl backdrop-blur-md">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      {editingDriver ? "Edit Driver" : "Add New Driver"}
                    </h2>
                    <p className="text-blue-100 font-medium opacity-80 mt-1">
                      {editingDriver ? "Update driver credentials and vehicle assignment" : "Register a new driver to your fleet network"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-8 pb-10 -mt-10">
                <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 ml-1">Driver Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    {/* Email - Only for new drivers */}
                    {!editingDriver && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>
                    )}

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 ml-1">
                        {editingDriver ? "New Password" : "Login Password"}
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="password"
                          required={!editingDriver}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium"
                          placeholder={editingDriver ? "Leave blank to keep current" : "••••••••"}
                        />
                      </div>
                    </div>

                    {/* License Number */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 ml-1">License Number</label>
                      <div className="relative group">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium uppercase"
                          placeholder="DL-XXXX-XXXXXX"
                        />
                      </div>
                    </div>

                    {/* Vehicle Assignment */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 ml-1">Assign Vehicle</label>
                      <div className="relative group">
                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                        <select
                          value={formData.assignedVehicle}
                          onChange={(e) => setFormData({ ...formData, assignedVehicle: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium appearance-none"
                        >
                          <option value="">No Vehicle Assigned</option>
                          {vehicles.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.registrationNumber} - {v.make}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 ml-1">Driver Status</label>
                      <div className="relative group">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium appearance-none"
                        >
                          <option value="Available">Available</option>
                          <option value="On Trip">On Trip</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Profile Pic URL */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Profile Picture URL (Optional)</label>
                    <div className="relative group">
                      <Camera className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        value={formData.profilePic}
                        onChange={(e) => setFormData({ ...formData, profilePic: e.target.value })}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                      {editingDriver ? (
                        <>
                          <Check className="h-5 w-5" />
                          Update Driver
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Confirm Registration
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

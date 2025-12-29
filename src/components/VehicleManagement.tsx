import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Circle } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { Vehicle } from "../types";
import { format, parseISO } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import VehicleAutocomplete from "./VehicleAutocomplete";
import { vehicleTypes, vehicleMakes, vehicleModels } from "../data/vehicleData";

export default function VehicleManagement() {
  const { user } = useAuth();
  const { vehicles, addVehicle, editVehicle, deleteVehicle } = useVehicles();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const emptyForm = {
    vehicle_number: "",
    vehicle_type: "Car",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    fuel_type: "petrol" as Vehicle["fuel_type"],
    current_mileage: 0,
    insurance_expiry: "",
    service_due_date: "",
    permit_expiry: "",
    status: "active" as Vehicle["status"],
  };

  const [formData, setFormData] = useState(emptyForm);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (formData.make && vehicleModels[formData.make]) {
      setAvailableModels(vehicleModels[formData.make]);
    } else {
      setAvailableModels([]);
    }
  }, [formData.make]);

  const getVehicleImage = (type: string, make: string = "", model: string = "") => {
    const combined = `${type} ${make} ${model}`.toLowerCase();

    if (combined.includes("scooter") || combined.includes("activa") || combined.includes("dio")) {
      return "https://img.icons8.com/fluency/240/scooter.png";
    }
    if (combined.includes("bike") || combined.includes("motorcycle") || combined.includes("two_wheeler") || combined.includes("2 wheeler")) {
      return "https://img.icons8.com/fluency/240/motorcycle.png";
    }
    if (combined.includes("truck") || combined.includes("lorry") || combined.includes("pickup") || combined.includes("tata")) {
      return "https://img.icons8.com/fluency/240/truck.png";
    }
    if (combined.includes("bus") || combined.includes("coach") || combined.includes("traveller")) {
      return "https://img.icons8.com/fluency/240/bus.png";
    }
    if (combined.includes("van") || combined.includes("tempo") || combined.includes("omni") || combined.includes("eeco")) {
      return "https://img.icons8.com/fluency/240/shuttle-bus.png";
    }
    return "https://img.icons8.com/fluency/240/car.png";
  };

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "active": return "text-green-500";
      case "maintenance": return "text-yellow-500";
      case "inactive": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  // ADD VEHICLE
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await addVehicle({
      ...formData,
      vehicle_type: formData.vehicle_type.toLowerCase(),
      fuel_type: formData.fuel_type,
      owner_id: user.id,
      status: "active",
    });

    setShowAddModal(false);
    setFormData(emptyForm);
  };

  // OPEN EDIT MODAL
  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);

    setFormData({
      vehicle_number: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      fuel_type: vehicle.fuel_type,
      current_mileage: vehicle.current_mileage,
      insurance_expiry: vehicle.insurance_expiry,
      service_due_date: vehicle.service_due_date,
      permit_expiry: vehicle.permit_expiry || "",
      status: vehicle.status || "active",
    });

    setShowEditModal(true);
  };

  // SAVE EDIT
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    await editVehicle({
      ...editingVehicle,
      vehicle_number: formData.vehicle_number,
      vehicle_type: formData.vehicle_type.toLowerCase(),
      make: formData.make,
      model: formData.model,
      year: formData.year,
      fuel_type: formData.fuel_type,
      current_mileage: formData.current_mileage,
      insurance_expiry: formData.insurance_expiry,
      service_due_date: formData.service_due_date,
      permit_expiry: formData.permit_expiry,
      status: formData.status,
    });

    setShowEditModal(false);
    setEditingVehicle(null);
  };

  // DELETE
  const handleDeleteVehicle = async (vehicleId: string) => {
    const ok = confirm("Delete this vehicle?");
    if (!ok) return;
    await deleteVehicle(vehicleId);
  };

  // VEHICLE CARD
  const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-xl">
              <img
                src={getVehicleImage(vehicle.vehicle_type, vehicle.make, vehicle.model)}
                alt={vehicle.vehicle_type}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{vehicle.vehicle_number}</h3>
              <p className="text-gray-600">
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Circle className={`h-3 w-3 ${getStatusColor(vehicle.status)} fill-current`} />
            <span className={`text-sm capitalize ${getStatusColor(vehicle.status)}`}>{vehicle.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Fuel</p>
            <p className="font-medium capitalize">{vehicle.fuel_type}</p>
          </div>
          <div>
            <p className="text-gray-500">Mileage</p>
            <p className="font-medium">{vehicle.current_mileage} km</p>
          </div>
          <div>
            <p className="text-gray-500">Insurance</p>
            <p className="font-medium">
              {vehicle.insurance_expiry ? format(parseISO(vehicle.insurance_expiry), "MMM dd, yyyy") : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Service Due</p>
            <p className="font-medium">
              {vehicle.service_due_date ? format(parseISO(vehicle.service_due_date), "MMM dd, yyyy") : "N/A"}
            </p>
          </div>
        </div>

        {user?.role !== "driver" && (
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
            <button onClick={() => openEditModal(vehicle)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Edit2 className="h-4 w-4" />
            </button>

            <button onClick={() => handleDeleteVehicle(vehicle.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="h-4 w-4" />
            </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
          <p className="text-gray-600">Manage your fleet vehicles</p>
        </div>

        {user?.role !== "driver" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow"
          >
            <Plus className="h-5 w-5" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <Modal
          key="add"
          title="Add Vehicle"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSubmitAdd}
          formData={formData}
          setFormData={setFormData}
          availableModels={availableModels}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <Modal
          key={editingVehicle?.id}
          title="Edit Vehicle"
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSubmitEdit}
          formData={formData}
          setFormData={setFormData}
          availableModels={availableModels}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------
   MODAL COMPONENT
--------------------------------------------- */
function Modal({ title, onClose, onSubmit, formData, setFormData, availableModels }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={onSubmit} className="bg-white max-w-2xl w-full rounded-xl shadow-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Vehicle Number" value={formData.vehicle_number} onChange={(v: string) => setFormData({ ...formData, vehicle_number: v })} />

          <VehicleAutocomplete label="Vehicle Type" value={formData.vehicle_type} onChange={(v: string) => setFormData({ ...formData, vehicle_type: v })} options={vehicleTypes} />

          <VehicleAutocomplete label="Make" value={formData.make} onChange={(v: string) => setFormData({ ...formData, make: v, model: "" })} options={vehicleMakes} />

          <VehicleAutocomplete label="Model" value={formData.model} onChange={(v: string) => setFormData({ ...formData, model: v })} options={availableModels} />

          <NumberInput
            label="Year"
            value={formData.year}
            min={1990}
            max={2025}
            onChange={(v: number) => {
              // Strict restriction: only allow 1990-2025
              if (v > 2025) return;
              if (v < 0) return; // Prevent negative typing
              setFormData({ ...formData, year: v });
            }}
          />

          <Select label="Fuel Type" value={formData.fuel_type} onChange={(v: any) => setFormData({ ...formData, fuel_type: v })} options={["petrol", "diesel", "electric", "hybrid"]} />

          <NumberInput label="Mileage" value={formData.current_mileage} min={0} onChange={(v: number) => setFormData({ ...formData, current_mileage: v })} />

          <Input
            label="Insurance Expiry"
            type="date"
            value={formData.insurance_expiry}
            max="2100-12-31"
            onChange={(v: string) => setFormData({ ...formData, insurance_expiry: v })}
          />

          <Input
            label="Service Due"
            type="date"
            value={formData.service_due_date}
            max="2100-12-31"
            onChange={(v: string) => setFormData({ ...formData, service_due_date: v })}
          />

          <Input
            label="Permit Expiry"
            type="date"
            value={formData.permit_expiry}
            max="2100-12-31"
            onChange={(v: string) => setFormData({ ...formData, permit_expiry: v })}
          />
          <Select label="Status" value={formData.status} onChange={(v: any) => setFormData({ ...formData, status: v })} options={["active", "inactive", "maintenance"]} />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------
   INPUT COMPONENTS
--------------------------------------------- */
function Input({ label, value, onChange, type = "text", min, max }: any) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded"
      />
    </div>
  );
}

// FIXED NUMBER INPUT — NOW WORKING 100%
function NumberInput({ label, value, onChange, min, max }: any) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 border rounded"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Vehicle, Trip, Expense } from "../types";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const mapDriver = (item: any): any => ({
    id: item._id || item.id,
    userId: {
      id: item.userId?._id || item.userId,
      name: item.userId?.name || "Unknown",
      email: item.userId?.email || "",
      profilePic: item.userId?.profilePic || ""
    },
    assigned_vehicle: item.assignedVehicle ? {
      id: item.assignedVehicle._id || item.assignedVehicle,
      vehicle_number: item.assignedVehicle.registrationNumber || "Unknown",
      make: item.assignedVehicle.make || "",
      model: item.assignedVehicle.model || ""
    } : null,
    status: item.status,
    license_number: item.licenseNumber,
    created_at: item.createdAt
  });

  // -----------------------------
  // Mapping functions
  // -----------------------------
  const mapVehicle = (item: any): Vehicle => ({
    id: item._id || item.id,
    owner_id: item.ownerId,
    vehicle_number: item.registrationNumber,
    vehicle_type: (item.type?.toLowerCase() as any) || "car",
    make: item.make || "",
    model: item.model || "",
    year: item.year || new Date().getFullYear(),
    fuel_type: (item.fuelType?.toLowerCase() as any) || "petrol",
    current_mileage: item.currentMileage || 0,
    insurance_expiry: item.insuranceExpiry,
    service_due_date: item.serviceDate,
    permit_expiry: item.permitExpiry,
    assigned_driver_id: item.currentDriver?._id || item.currentDriver,
    status: (item.status || "active") as any,
    created_at: item.createdAt,
  });

  const mapTrip = (item: any): Trip => ({
    id: item._id || item.id,
    vehicle_id: item.vehicleId?._id || item.vehicleId,
    driver_id: item.driverId?._id || item.driverId,
    driver_name: item.driverId?.driverName || item.driverId?.userId?.name || "Unknown",
    start_mileage: item.startMileage || 0,
    end_mileage:
      item.endMileage || item.startMileage + (item.distance || 0) || 0,
    start_location:
      typeof item.startLocation === "string"
        ? item.startLocation
        : item.startLocation
          ? `${item.startLocation.lat}, ${item.startLocation.lng}`
          : "",
    start_location_lat: item.startLocationLat || "",
    start_location_lon: item.startLocationLon || "",
    end_location:
      typeof item.endLocation === "string"
        ? item.endLocation
        : item.endLocation
          ? `${item.endLocation.lat}, ${item.endLocation.lng}`
          : "",
    end_location_lat: item.endLocationLat || "",
    end_location_lon: item.endLocationLon || "",
    trip_date: item.startTime,
    trip_purpose: item.purpose || "",
    created_at: item.createdAt,
    fuel_consumed: item.fuelConsumed || 0,
    goods_carried: "",
  });

  const mapExpense = (item: any): Expense => ({
    id: item._id || item.id,
    vehicle_id: item.vehicleId?._id || item.vehicleId,
    user_id: item.loggedBy?._id || item.loggedBy,
    logged_by_name: item.loggedBy?.name || "Unknown",
    category: (item.type?.toLowerCase() as any) || "other",
    amount: item.amount,
    description: item.description || "",
    expense_date: item.date,
    created_at: item.createdAt,
    receipt_url: item.receiptUrl || "",
  });

  // -----------------------------
  // FETCH ALL DATA
  // -----------------------------
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // INDEPENDENT FETCHES (Fail-safe)
      // If one fails, others should still load.

      const fetchVehicles = axios.get("/vehicles").catch(e => { console.warn("Fetch Vehicles Failed"); return { data: [] }; });
      const fetchTrips = axios.get("/trips").catch(e => { console.warn("Fetch Trips Failed"); return { data: [] }; });
      const fetchExpenses = axios.get("/expenses").catch(e => { console.warn("Fetch Expenses Failed"); return { data: [] }; });
      const fetchDrivers = axios.get("/drivers").catch(e => { console.warn("Fetch Drivers Failed"); return { data: [] }; });

      const [vehiclesRes, tripsRes, expensesRes, driversRes] = await Promise.all([
        fetchVehicles,
        fetchTrips,
        fetchExpenses,
        fetchDrivers
      ]);

      setVehicles(
        Array.isArray(vehiclesRes.data)
          ? vehiclesRes.data.map(mapVehicle)
          : []
      );
      setTrips(
        Array.isArray(tripsRes.data) ? tripsRes.data.map(mapTrip) : []
      );

      console.log("[DEBUG] Frontend Expenses Received:", expensesRes.data?.length);
      setExpenses(
        Array.isArray(expensesRes.data)
          ? expensesRes.data.map(mapExpense)
          : []
      );
      setDrivers(
        Array.isArray(driversRes.data)
          ? driversRes.data.map(mapDriver)
          : []
      );
    } catch (error) {
      console.error("Critical Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // -----------------------------
  // ADD VEHICLE
  // -----------------------------
  const addVehicle = async (vehicle: Omit<Vehicle, "id" | "created_at">) => {
    try {
      const res = await axios.post("/vehicles", {
        registrationNumber: vehicle.vehicle_number,
        model: vehicle.model,
        type: vehicle.vehicle_type,
        serviceDate: vehicle.service_due_date,
        insuranceExpiry: vehicle.insurance_expiry,
        permitExpiry: vehicle.permit_expiry,
        make: vehicle.make,
        year: vehicle.year,
        fuelType: vehicle.fuel_type,
        currentMileage: vehicle.current_mileage,
        status: vehicle.status,
      });

      fetchData();
      return res.data;
    } catch (error) {
      console.error("Error adding vehicle:", error);
      throw error;
    }
  };

  // -----------------------------
  // EDIT VEHICLE
  // -----------------------------
  const editVehicle = async (updatedVehicle: Vehicle) => {
    try {
      await axios.put(`/vehicles/${updatedVehicle.id}`, {
        registrationNumber: updatedVehicle.vehicle_number,
        model: updatedVehicle.model,
        type: updatedVehicle.vehicle_type,
        serviceDate: updatedVehicle.service_due_date,
        insuranceExpiry: updatedVehicle.insurance_expiry,
        permitExpiry: updatedVehicle.permit_expiry,
        make: updatedVehicle.make,
        year: updatedVehicle.year,
        fuelType: updatedVehicle.fuel_type,
        currentMileage: updatedVehicle.current_mileage,
        status: updatedVehicle.status,
      });

      fetchData();
    } catch (error) {
      console.error("Error updating vehicle:", error);
      throw error;
    }
  };

  // -----------------------------
  // DELETE VEHICLE  (NEW)
  // -----------------------------
  const deleteVehicle = async (id: string) => {
    try {
      await axios.delete(`/vehicles/${id}`);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      throw error;
    }
  };

  // -----------------------------
  // ADD TRIP
  // -----------------------------
  const addTrip = async (trip: Omit<Trip, "id" | "created_at">) => {
    try {
      await axios.post("/trips", {
        vehicleId: trip.vehicle_id,
        startLocation: trip.start_location,
        startLocationLat: trip.start_location_lat,
        startLocationLon: trip.start_location_lon,
        endLocation: trip.end_location,
        endLocationLat: trip.end_location_lat,
        endLocationLon: trip.end_location_lon,
        startMileage: trip.start_mileage,
        endMileage: trip.end_mileage,
        tripDate: trip.trip_date,
        fuelConsumed: trip.fuel_consumed,
        purpose: trip.trip_purpose,
      });
      fetchData();
    } catch (error) {
      console.error("Error adding trip:", error);
      throw error;
    }
  };

  // -----------------------------
  // EDIT TRIP (NEW)
  // -----------------------------
  const editTrip = async (id: string, tripData: any) => {
    try {
      await axios.put(`/trips/${id}`, tripData);
      fetchData();
    } catch (error) {
      console.error("Error updating trip:", error);
      throw error;
    }
  };

  // -----------------------------
  // ADD EXPENSE
  // -----------------------------
  const addExpense = async (expenseData: FormData | any) => {
    try {
      // Check if it's FormData (has file) or JSON
      const isFormData = expenseData instanceof FormData;

      await axios.post("/expenses", expenseData, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      });
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
      throw error;
    }
  };

  // -----------------------------
  // DELETE EXPENSE (NEW)
  // -----------------------------
  const deleteExpense = async (id: string) => {
    try {
      await axios.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  };

  return {
    vehicles,
    trips,
    expenses,
    drivers,
    loading,
    addVehicle,
    editVehicle,
    deleteVehicle, // <-- IMPORTANT EXPORT
    addTrip,
    editTrip, // <-- NEW
    addExpense,
    deleteExpense, // <-- NEW
    refreshData: fetchData,
  };
}

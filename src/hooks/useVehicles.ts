import { useState, useEffect } from "react";
import { Vehicle, Trip, Expense } from "../types";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const mapVehicle = (item: any): Vehicle => ({
    id: item._id || item.id,
    owner_id: item.ownerId,
    vehicle_number: item.registrationNumber,
    vehicle_type: item.type?.toLowerCase() || "car",
    make: item.make,
    model: item.model,
    year: item.year,
    fuel_type: item.fuelType,
    current_mileage: item.currentMileage,
    insurance_expiry: item.insuranceExpiry,
    service_due_date: item.serviceDate,
    permit_expiry: item.permitExpiry,
    assigned_driver_id: item.currentDriver,
    status: item.status || "active",
    created_at: item.createdAt,
  });

  const mapExpense = (item: any): Expense => ({
    id: item._id,
    vehicle_id: item.vehicleId?._id || item.vehicleId,
    user_id: item.loggedBy?._id,
    logged_by_name: item.loggedBy?.name || "Unknown",
    category: item.type?.toLowerCase(),
    amount: item.amount,
    description: item.description,
    expense_date: item.date,
    created_at: item.createdAt,
    receipt_url: item.receiptUrl,
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [vehiclesRes, tripsRes, expensesRes] = await Promise.all([
        axios.get("/api/vehicles"),
        axios.get("/api/trips"),
        axios.get("/api/expenses"),
      ]);

      setVehicles(vehiclesRes.data.map(mapVehicle));
      setTrips(tripsRes.data.map((t: any) => t));
      setExpenses(expensesRes.data.map(mapExpense));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    vehicles,
    trips,
    expenses,
    loading,
    refreshData: fetchData,
  };
}

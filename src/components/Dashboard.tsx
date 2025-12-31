import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  Car,
  MapPin,
  DollarSign,
  AlertTriangle,
  Activity,
  Gauge,
  Calendar,
  TrendingUp,
  Wrench,
  Receipt,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useVehicles } from "../hooks/useVehicles";
import { useAuth } from "../contexts/AuthContext";
import { format, subDays, parseISO, isAfter } from "date-fns";

// Simple type helpers so TS stays happy with your existing data
type AnyVehicle = any;
type AnyTrip = any;
type AnyExpense = any;

const VEHICLE_IMAGES = {
  bike: "https://img.icons8.com/fluency/240/motorcycle.png",
  scooter: "https://img.icons8.com/fluency/240/scooter.png",
  car: "https://img.icons8.com/fluency/240/car.png",
  truck: "https://img.icons8.com/fluency/240/truck.png",
  bus: "https://img.icons8.com/fluency/240/bus.png",
  van: "https://img.icons8.com/fluency/240/shuttle-bus.png",
};

// Resolve correct image based on vehicle type
// Resolve correct image based on vehicle type
const vehicleImageFor = (vehicle: AnyVehicle) => {
  const rawType = (vehicle.vehicle_type || vehicle.type || "").toLowerCase();
  const rawMake = (vehicle.make || "").toLowerCase();
  const rawModel = (vehicle.model || "").toLowerCase();

  const combined = `${rawType} ${rawMake} ${rawModel}`;

  if (combined.includes("scooter") || combined.includes("activa") || combined.includes("dio")) {
    return VEHICLE_IMAGES.scooter;
  }

  if (
    combined.includes("bike") ||
    combined.includes("motorcycle") ||
    combined.includes("two wheeler") ||
    combined.includes("2 wheeler")
  ) {
    return VEHICLE_IMAGES.bike;
  }

  if (combined.includes("truck") || combined.includes("lorry") || combined.includes("pickup") || combined.includes("tata")) {
    return VEHICLE_IMAGES.truck;
  }

  if (combined.includes("bus") || combined.includes("coach") || combined.includes("traveller")) {
    return VEHICLE_IMAGES.bus;
  }

  if (combined.includes("van") || combined.includes("tempo") || combined.includes("omni") || combined.includes("eeco")) {
    return VEHICLE_IMAGES.van;
  }

  // default: car
  return VEHICLE_IMAGES.car;
};

// Small stat card
const StatCard = ({
  title,
  value,
  icon: Icon,
  accent,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: any;
  accent: string;
  subtitle?: string;
}) => (
  <motion.div
    whileHover={{ translateY: -4, boxShadow: "0 10px 30px rgba(15,23,42,0.18)" }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-5 py-4 text-white"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {title}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accent}-500/15`}
      >
        <Icon className={`h-5 w-5 text-${accent}-400`} />
      </div>
    </div>
    <div className="pointer-events-none absolute -right-10 bottom-[-40px] h-32 w-32 rounded-full bg-white/5" />
  </motion.div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { vehicles, trips, expenses } = useVehicles();
  const [assignedVehicle, setAssignedVehicle] = useState<AnyVehicle | null>(
    null
  );

  // ---------------- DRIVER-SPECIFIC DATA ----------------
  useEffect(() => {
    if (user?.role === "driver") {
      const fetchMyVehicle = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${API_URL}/api/drivers/my-vehicle`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.vehicle) {
            setAssignedVehicle(res.data.vehicle);
          }
        } catch (err) {
          console.error("Error fetching assigned vehicle:", err);
        }
      };
      fetchMyVehicle();
    }
  }, [user]);

  // ---------------- DERIVED METRICS ----------------
  // ---------------- DERIVED METRICS ----------------
  // For drivers, we only care about THEIR assigned vehicle's data
  // But wait, the backend should already be returning filtered data via useVehicles if we implemented it right?
  // Let's assume useVehicles returns "what the user is allowed to see".
  // BUT: The "Total Vehicles" count for a driver is meaningless? No, they might see fleet size.
  // Actually, user wants to see THEIR stats.

  const isDriver = user?.role === "driver";

  const relevantExpenses = useMemo(() => {
    if (isDriver && assignedVehicle) {
      return expenses.filter(e => e.vehicle_id === assignedVehicle._id || e.vehicle_id === assignedVehicle.id);
    }
    return expenses;
  }, [isDriver, assignedVehicle, expenses]);

  const relevantTrips = useMemo(() => {
    if (isDriver && assignedVehicle) {
      return trips.filter(t => t.vehicle_id === assignedVehicle._id || t.vehicle_id === assignedVehicle.id);
    }
    return trips;
  }, [isDriver, assignedVehicle, trips]);

  const totalVehicles = vehicles.length;
  const totalTrips = isDriver ? relevantTrips.length : trips.length;
  const totalExpenses = (isDriver ? relevantExpenses : expenses).reduce(
    (s: number, e: AnyExpense) => s + (e.amount || 0),
    0
  );

  const activeVehicles = vehicles.filter(
    (v: AnyVehicle) => v.status === "active"
  ).length;

  const upcomingReminders: AnyVehicle[] = vehicles.filter((v: AnyVehicle) => {
    try {
      const insuranceExpiry = v.insurance_expiry
        ? parseISO(v.insurance_expiry)
        : null;
      const serviceDate = v.service_due_date
        ? parseISO(v.service_due_date)
        : null;

      const thirtyDaysFromNow = subDays(new Date(), -30);

      return (
        (insuranceExpiry && isAfter(thirtyDaysFromNow, insuranceExpiry)) ||
        (serviceDate && isAfter(thirtyDaysFromNow, serviceDate))
      );
    } catch {
      return false;
    }
  });

  // Monthly expenses for last 6 months
  const monthlyExpenses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subDays(new Date(), (5 - i) * 30);
      const month = date.getMonth();
      const year = date.getFullYear();

      const amount = (isDriver ? relevantExpenses : expenses)
        .filter((exp: AnyExpense) => {
          const d = new Date(exp.expense_date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((s: number, e: AnyExpense) => s + (e.amount || 0), 0);

      return { month: format(date, "MMM"), amount };
    });
  }, [expenses, relevantExpenses, isDriver]);

  // Fleet health breakdown by status
  const fleetStatusBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    vehicles.forEach((v: AnyVehicle) => {
      const key = (v.status || "unknown").toLowerCase();
      grouped[key] = (grouped[key] || 0) + 1;
    });

    const colorMap: Record<string, string> = {
      active: "#22C55E",
      maintenance: "#F97316",
      inactive: "#9CA3AF",
      unknown: "#6366F1",
    };

    return Object.entries(grouped).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colorMap[status] || "#6366F1",
    }));
  }, [vehicles]);

  // Top vehicles by distance driven (based on trips)
  const topVehiclesByDistance = useMemo(() => {
    const distanceMap: Record<string, number> = {};

    (isDriver ? relevantTrips : trips).forEach((t: AnyTrip) => {
      const distance = (t.end_mileage ?? 0) - (t.start_mileage ?? 0);
      if (!t.vehicle_id) return;
      distanceMap[t.vehicle_id] = (distanceMap[t.vehicle_id] || 0) + distance;
    });

    const enriched = Object.entries(distanceMap)
      .map(([vehicleId, distance]) => {
        const vehicle = vehicles.find((v: AnyVehicle) => v.id === vehicleId);
        return {
          id: vehicleId,
          distance,
          vehicle_number: vehicle?.vehicle_number || "Unknown",
          makeModel: vehicle ? `${vehicle.make} ${vehicle.model}` : "Unknown Vehicle",
        };
      })
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 4);

    return enriched;
  }, [trips, vehicles]);

  // Recent 5 trips
  const recentTrips = useMemo(
    () => (isDriver ? relevantTrips : trips).slice(0, 5),
    [trips, relevantTrips, isDriver]
  );

  // Recent 5 expenses
  const recentExpensesList = useMemo(
    () => [...(isDriver ? relevantExpenses : expenses)].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()).slice(0, 5),
    [expenses, relevantExpenses, isDriver]
  );

  // ---------------- RENDER ----------------
  const isDriver = user?.role === "driver";

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {isDriver ? "Driver Dashboard" : "Fleet Command Center"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back{user?.name ? `, ${user.name}` : ""}. Here’s what’s
            happening in your fleet today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Action buttons removed as they were placeholders */}
        </div>
      </div>

      {/* DRIVER ASSIGNED VEHICLE CARD */}
      {isDriver && assignedVehicle && (
        <motion.div
          initial={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-xl"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">
                  Your Assigned Vehicle
                </p>
                <p className="text-2xl font-bold">
                  {assignedVehicle.registrationNumber ||
                    assignedVehicle.vehicle_number}
                </p>
                <p className="text-sm text-white/80">
                  {assignedVehicle.make} {assignedVehicle.model} •{" "}
                  {assignedVehicle.type || assignedVehicle.vehicle_type}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-black/20 px-3 py-2 text-xs">
                <span className="font-semibold">Fuel:</span>{" "}
                {assignedVehicle.fuelType || assignedVehicle.fuel_type || "N/A"}
              </div>
              <div className="rounded-xl bg-black/20 px-3 py-2 text-xs">
                <span className="font-semibold">Status:</span>{" "}
                <span className="capitalize">{assignedVehicle.status || "active"}</span>
              </div>
              {assignedVehicle.currentMileage && (
                <div className="rounded-xl bg-black/20 px-3 py-2 text-xs">
                  <span className="font-semibold">Odometer:</span>{" "}
                  {assignedVehicle.currentMileage} km
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI STRIP */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isDriver && (
          <StatCard
            title="Total Vehicles"
            value={totalVehicles}
            icon={Car}
            accent="indigo"
            subtitle={`${activeVehicles} active in operation`}
          />
        )}
        <StatCard
          title="Trips Logged"
          value={totalTrips}
          icon={MapPin}
          accent="cyan"
          subtitle="Lifetime completed trips"
        />
        <StatCard
          title="Total Spend"
          value={`₹${totalExpenses.toLocaleString()}`}
          icon={DollarSign}
          accent="emerald"
          subtitle="All recorded expenses"
        />
        <StatCard
          title="Health Alerts"
          value={upcomingReminders.length}
          icon={AlertTriangle}
          accent="amber"
          subtitle="Due in next 30 days"
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN – VEHICLES / HEALTH */}
        <div className="space-y-6">
          {/* Vehicle list */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Fleet Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Quick look at all registered vehicles
                </p>
              </div>
              <Gauge className="h-5 w-5 text-slate-400" />
            </div>

            <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {isDriver && assignedVehicle ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-indigo-50">
                      <img
                        src={vehicleImageFor(assignedVehicle)}
                        alt=""
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-indigo-900 leading-tight">
                        {assignedVehicle.make} {assignedVehicle.model}
                      </h4>
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">
                        {assignedVehicle.registrationNumber || assignedVehicle.vehicle_number}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 border border-indigo-100 shadow-sm">
                          {assignedVehicle.type || assignedVehicle.vehicle_type || "Car"}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100 shadow-sm">
                          {assignedVehicle.fuelType || assignedVehicle.fuel_type || "Petrol"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : vehicles.map((v: AnyVehicle) => (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50"
                >
                  <div className="h-14 w-14 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-xl group-hover:bg-indigo-50 transition-colors">
                    <img
                      src={vehicleImageFor(v)}
                      alt={v.vehicle_number}
                      className="h-10 w-10 object-contain p-1"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {v.make} {v.model}
                    </p>
                    <p className="text-xs font-medium text-indigo-600">
                      {v.vehicle_number}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 capitalize">
                      {v.vehicle_type || v.type || "car"} • {v.fuel_type || v.fuelType || "petrol"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${v.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : v.status === "maintenance"
                          ? "bg-amber-100 text-amber-700"
                          : v.status === "inactive"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {v.status || "Unknown"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {v.service_due_date
                        ? `Service: ${format(
                          parseISO(v.service_due_date),
                          "MMM dd"
                        )}`
                        : "Service: N/A"}
                    </span>
                  </div>
                </motion.div>
              ))}

              {!isDriver && vehicles.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  No vehicles added yet.
                </div>
              )}

              {isDriver && !assignedVehicle && (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Car className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-medium">No vehicle assigned to you yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Fleet health donut */}
          {!isDriver && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Fleet Health
                  </h3>
                  <p className="text-xs text-slate-500">
                    Status distribution across your vehicles
                  </p>
                </div>
                <Activity className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-40 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fleetStatusBreakdown}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={3}
                      >
                        {fleetStatusBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {fleetStatusBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: item.color }}
                        />
                        <span className="capitalize text-slate-600">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-900">
                        {item.value} vehicles
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN – CHARTS & RECENT ACTIVITY */}
        <div className="space-y-6 lg:col-span-2">
          {/* Monthly expenses line chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Spend Trend
                </h3>
                <p className="text-xs text-slate-500">
                  Monthly expenses over the last 6 months
                </p>
              </div>
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <Tooltip formatter={(v: any) => `₹${v}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366F1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense breakdown + top vehicles + recent trips */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Recent Expenses */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent Expenses
                </h3>
                <Receipt className="h-5 w-5 text-slate-400" />
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1 text-xs">
                {recentExpensesList.map((exp: AnyExpense) => {
                  const vehicle = vehicles.find((v: AnyVehicle) => v.id === exp.vehicle_id);
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {exp.description || exp.category}
                        </p>
                        <p className="text-[11px] font-medium text-indigo-600">
                          {vehicle?.vehicle_number || "Unknown"}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {exp.logged_by_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-rose-600">
                          ₹{exp.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {format(new Date(exp.expense_date), "MMM dd")}
                        </p>
                        {exp.receipt_url && (
                          <button
                            onClick={() => window.open(exp.receipt_url, '_blank')}
                            className="text-[10px] text-blue-600 hover:underline flex items-center justify-end gap-1 mt-0.5"
                          >
                            <Receipt size={10} /> View Bill
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {recentExpensesList.length === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    No expenses recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Top vehicles by distance */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Movers
                </h3>
                <TrendingUp className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-2 text-xs">
                {topVehiclesByDistance.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {v.makeModel}
                      </p>
                      <p className="text-[11px] font-medium text-indigo-600">
                        {v.vehicle_number}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-600">
                      {v.distance.toFixed(0)} km
                    </p>
                  </div>
                ))}
                {topVehiclesByDistance.length === 0 && (
                  <p className="py-6 text-center text-slate-400">
                    No trip data yet.
                  </p>
                )}
              </div>
            </div>

            {/* Recent trips */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent Trips
                </h3>
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1 text-xs">
                {recentTrips.map((trip: AnyTrip) => {
                  const vehicle = vehicles.find(
                    (v: AnyVehicle) => v.id === trip.vehicle_id
                  );
                  const distance =
                    (trip.end_mileage ?? 0) - (trip.start_mileage ?? 0);

                  return (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {trip.start_location} → {trip.end_location}
                        </p>
                        <p className="text-[11px] font-medium text-indigo-600">
                          {vehicle ? `${vehicle.make} ${vehicle.model}` : "Unknown"}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {vehicle?.vehicle_number}
                          <span className="mx-1.5 text-slate-300">•</span>
                          {format(new Date(trip.trip_date), "MMM dd")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-900">
                          {distance} km
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {trip.fuel_consumed
                            ? `${trip.fuel_consumed} L`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {recentTrips.length === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    No trips recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REMINDERS STRIP */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Upcoming Reminders
            </h3>
            <p className="text-xs text-slate-500">
              Service / insurance due in the next 30 days
            </p>
          </div>
          <Wrench className="h-5 w-5 text-slate-400" />
        </div>

        <div className="space-y-3">
          {upcomingReminders.map((v: AnyVehicle) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-16 flex-shrink-0 flex items-center justify-center bg-white rounded-lg shadow-sm">
                  <img
                    src={vehicleImageFor(v)}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {v.vehicle_number}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {v.make} {v.model}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-amber-700">
                  Due Soon
                </p>
                <p className="text-[11px] text-slate-500">
                  {v.service_due_date
                    ? format(parseISO(v.service_due_date), "MMM dd, yyyy")
                    : "No service date"}
                </p>
              </div>
            </div>
          ))}

          {upcomingReminders.length === 0 && (
            <div className="py-6 text-center text-slate-400">
              Everything looks good. No reminders right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
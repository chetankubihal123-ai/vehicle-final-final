import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Car,
  MapPin,
  DollarSign,
  AlertTriangle,
  Activity,
  Gauge,
  Calendar,
  Filter,
  TrendingUp,
  Fuel,
  Wrench,
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
  bike:
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop",
  car:
    "https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=1200&auto=format&fit=crop",
  truck:
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
  bus:
    "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
};

// Resolve correct image based on vehicle type
const vehicleImageFor = (vehicle: AnyVehicle) => {
  const rawType = (
    vehicle.vehicle_type ||
    vehicle.type ||
    ""
  ).toLowerCase();

  const rawMake = (vehicle.make || "").toLowerCase();
  const rawModel = (vehicle.model || "").toLowerCase();

  const combined = `${rawType} ${rawMake} ${rawModel}`;

  if (
    combined.includes("bike") ||
    combined.includes("scooter") ||
    combined.includes("activa") ||
    combined.includes("motorcycle") ||
    combined.includes("two wheeler") ||
    combined.includes("2 wheeler")
  ) {
    return vehicle.image || "https://images.unsplash.com/photo-1558981403-c5f91cbba527?q=80&w=1200&auto=format&fit=crop"; // Better motorcycle image
  }

  if (combined.includes("truck") || combined.includes("lorry") || combined.includes("pickup")) {
    return vehicle.image || VEHICLE_IMAGES.truck;
  }

  if (combined.includes("bus") || combined.includes("van") || combined.includes("tempo")) {
    return vehicle.image || VEHICLE_IMAGES.bus;
  }

  // default: car
  return vehicle.image || VEHICLE_IMAGES.car;
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
          const res = await axios.get("/drivers/me/vehicle");
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
  const totalVehicles = vehicles.length;
  const totalTrips = trips.length;
  const totalExpenses = expenses.reduce(
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

      const amount = expenses
        .filter((exp: AnyExpense) => {
          const d = new Date(exp.expense_date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((s: number, e: AnyExpense) => s + (e.amount || 0), 0);

      return { month: format(date, "MMM"), amount };
    });
  }, [expenses]);

  // Expense breakdown by category
  const expenseBreakdown = useMemo(() => {
    const buckets = [
      {
        name: "Fuel",
        key: "fuel",
        color: "#6366F1",
      },
      {
        name: "Maintenance",
        key: "maintenance",
        color: "#10B981",
      },
      {
        name: "Insurance",
        key: "insurance",
        color: "#F59E0B",
      },
      {
        name: "Other",
        key: "other",
        color: "#EF4444",
      },
    ];

    const data = buckets.map((b) => {
      const value = expenses
        .filter((e: AnyExpense) =>
          b.key === "other"
            ? !["fuel", "maintenance", "insurance"].includes(e.category)
            : e.category === b.key
        )
        .reduce((s: number, e: AnyExpense) => s + (e.amount || 0), 0);
      return { name: b.name, value, color: b.color };
    });

    return data.filter((d) => d.value > 0);
  }, [expenses]);

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

    trips.forEach((t: AnyTrip) => {
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
    () => trips.slice(0, 5),
    [trips]
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
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Quick Filters
          </button>
          {!isDriver && (
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:opacity-90">
              <TrendingUp className="h-4 w-4" />
              Fleet Insights
            </button>
          )}
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
                <span className="font-semibold">Status:</span> Active
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
        <StatCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={Car}
          accent="indigo"
          subtitle={`${activeVehicles} active in operation`}
        />
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
              {vehicles.map((v: AnyVehicle) => (
                <motion.div
                  key={v.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50"
                >
                  <img
                    src={vehicleImageFor(v)}
                    alt={v.vehicle_number}
                    className="h-14 w-20 flex-shrink-0 rounded-lg object-cover"
                  />
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

              {vehicles.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  No vehicles added yet.
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
            {/* Expense Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Expense Mix
                </h3>
                <Fuel className="h-5 w-5 text-slate-400" />
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      label
                    >
                      {expenseBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `₹${v}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {expenseBreakdown.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: e.color }}
                      />
                      <span className="text-slate-600">{e.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      ₹{e.value.toLocaleString()}
                    </span>
                  </div>
                ))}
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
                <img
                  src={vehicleImageFor(v)}
                  alt=""
                  className="h-10 w-16 rounded-lg object-cover"
                />
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
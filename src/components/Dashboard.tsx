import { useState, useEffect } from "react";
import axios from "axios";
import {
  Car,
  MapPin,
  DollarSign,
  AlertTriangle,
  Image as ImageIcon,
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

export default function Dashboard() {
  const { user } = useAuth();
  const { vehicles, trips, expenses } = useVehicles();
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'driver') {
      const fetchMyVehicle = async () => {
        try {
          const res = await axios.get('/drivers/me/vehicle');
          if (res.data.vehicle) {
            setAssignedVehicle(res.data.vehicle);
          }
        } catch (err) {
          console.error('Error fetching assigned vehicle:', err);
        }
      };
      fetchMyVehicle();
    }
  }, [user]);

  const totalVehicles = vehicles.length;
  const totalTrips = trips.length;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;

  const upcomingReminders = vehicles.filter((v) => {
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

  // Monthly Expenses
  const monthlyExpenses = Array.from({ length: 6 }, (_, i) => {
    const date = subDays(new Date(), (5 - i) * 30);
    const month = date.getMonth();
    const year = date.getFullYear();

    const amount = expenses
      .filter((exp) => {
        const d = new Date(exp.expense_date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);

    return { month: format(date, "MMM"), amount };
  });

  // Expense breakdown
  const expenseBreakdown = [
    {
      name: "Fuel",
      value: expenses
        .filter((e) => e.category === "fuel")
        .reduce((s, e) => s + (e.amount || 0), 0),
      color: "#6366F1",
    },
    {
      name: "Maintenance",
      value: expenses
        .filter((e) => e.category === "maintenance")
        .reduce((s, e) => s + (e.amount || 0), 0),
      color: "#10B981",
    },
    {
      name: "Insurance",
      value: expenses
        .filter((e) => e.category === "insurance")
        .reduce((s, e) => s + (e.amount || 0), 0),
      color: "#F59E0B",
    },
    {
      name: "Other",
      value: expenses
        .filter(
          (e) => !["fuel", "maintenance", "insurance"].includes(e.category)
        )
        .reduce((s, e) => s + (e.amount || 0), 0),
      color: "#EF4444",
    },
  ].filter((b) => b.value > 0);

  // Vehicle Image Resolver
  const vehicleImageFor = (vehicle: any) => {
    const type =
      (vehicle.vehicle_type || vehicle.make || "").toLowerCase();

    if (type.includes("truck"))
      return "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop";

    if (type.includes("bus"))
      return "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop";

    return (
      vehicle.image ||
      "https://images.unsplash.com/photo-1542362567-b07e54358753?q=80&w=1200&auto=format&fit=crop"
    );
  };

  // Stat Card Component
  const StatCard = ({ title, value, icon: Icon, gradient, subtitle }: any) => (
    <motion.div
      whileHover={{
        translateY: -6,
        boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
      }}
      className="rounded-2xl overflow-hidden p-5 text-white relative"
      style={{ background: gradient, minHeight: 130 }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs opacity-80 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-white/20 rounded-lg">
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div
        className="absolute"
        style={{
          right: -40,
          bottom: -30,
          width: 150,
          height: 150,
          background: "rgba(255,255,255,0.06)",
          borderRadius: "50%",
        }}
      />
    </motion.div>
  );

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Fleet Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back{user?.name ? `, ${user.name}` : ""} 👋
        </p>
      </div>

      {/* Assigned Vehicle Card for Drivers */}
      {user?.role === 'driver' && assignedVehicle && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Car className="h-6 w-6" />
              Your Assigned Vehicle
            </h2>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              Active
            </span>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={vehicleImageFor(assignedVehicle)}
              alt="Vehicle"
              className="w-32 h-24 rounded-lg object-cover border-2 border-white/30"
            />
            <div>
              <p className="text-3xl font-bold">{assignedVehicle.registrationNumber}</p>
              <p className="text-lg opacity-90">{assignedVehicle.make} {assignedVehicle.model}</p>
              <div className="flex gap-4 mt-2 text-sm opacity-80">
                <span>Type: {assignedVehicle.type}</span>
                <span>•</span>
                <span>Fuel: {assignedVehicle.fuelType}</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Vehicles"
          value={totalVehicles}
          icon={Car}
          gradient="linear-gradient(135deg,#7c3aed,#4f46e5)"
          subtitle={`${activeVehicles} active`}
        />
        <StatCard
          title="Total Trips"
          value={totalTrips}
          icon={MapPin}
          gradient="linear-gradient(135deg,#06b6d4,#0284c7)"
          subtitle="All time"
        />
        <StatCard
          title="Total Expenses"
          value={`₹${totalExpenses.toLocaleString()}`}
          icon={DollarSign}
          gradient="linear-gradient(135deg,#f97316,#ef4444)"
          subtitle="All time"
        />
        <StatCard
          title="Pending Reminders"
          value={upcomingReminders.length}
          icon={AlertTriangle}
          gradient="linear-gradient(135deg,#ef4444,#f97316)"
          subtitle="Next 30 days"
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VEHICLES LIST */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border h-full">
          <h3 className="text-lg font-semibold mb-4">Vehicles</h3>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
            {vehicles.map((v) => (
              <motion.div
                key={v.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-4 p-3 rounded-xl border hover:shadow transition"
              >
                <img
                  src={vehicleImageFor(v)}
                  alt={v.vehicle_number}
                  className="w-20 h-14 rounded-lg object-cover"
                />

                <div className="flex-1">
                  <p className="font-semibold">{v.vehicle_number}</p>
                  <p className="text-sm text-gray-500">
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Service Due:{" "}
                    {v.service_due_date
                      ? format(parseISO(v.service_due_date), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
              </motion.div>
            ))}

            {vehicles.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                <ImageIcon className="mx-auto w-10 h-10 mb-3 opacity-40" />
                No vehicles added yet
              </div>
            )}
          </div>
        </div>

        {/* CHARTS */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* MONTHLY EXPENSES */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Monthly Expenses</h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <Tooltip formatter={(v) => `₹${v}`} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#7c3aed"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EXPENSE BREAKDOWN + RECENT TRIPS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* EXPENSE PIE */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border">
              <h3 className="font-semibold mb-4">Expense Breakdown</h3>
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
                    <Tooltip formatter={(v) => `₹${v}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RECENT TRIPS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border md:col-span-2">
              <h3 className="font-semibold mb-4">Recent Trips</h3>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {trips.slice(0, 5).map((trip) => {
                  const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
                  const distance =
                    (trip.end_mileage ?? 0) - (trip.start_mileage ?? 0);

                  return (
                    <div
                      key={trip.id}
                      className="flex justify-between items-center p-3 border rounded-xl hover:shadow-sm transition"
                    >
                      <div>
                        <p className="font-semibold text-sm">
                          {trip.start_location} → {trip.end_location}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle?.vehicle_number || "Unknown"} •{" "}
                          {format(new Date(trip.trip_date), "MMM dd")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">{distance} km</p>

                        {/* FIXED: No syntax error */}
                        <p className="text-xs text-gray-500">
                          {trip.fuel_consumed
                            ? `${trip.fuel_consumed} L`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {trips.length === 0 && (
                  <div className="text-center text-gray-400 py-6">
                    No trips recorded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REMINDERS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border">
        <h3 className="font-semibold mb-4">Upcoming Reminders</h3>

        <div className="space-y-3">
          {upcomingReminders.map((v) => (
            <div
              key={v.id}
              className="flex justify-between items-center p-3 border rounded-xl hover:shadow-sm transition"
            >
              <div className="flex items-center gap-4">
                <img
                  src={vehicleImageFor(v)}
                  alt=""
                  className="w-16 h-12 rounded-lg object-cover"
                />
                <div>
                  <p className="font-semibold">{v.vehicle_number}</p>
                  <p className="text-xs text-gray-500">
                    {v.make} {v.model}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-yellow-600">Due Soon</p>
                <p className="text-xs text-gray-500">
                  {v.service_due_date
                    ? format(parseISO(v.service_due_date), "MMM dd, yyyy")
                    : "No date"}
                </p>
              </div>
            </div>
          ))}

          {upcomingReminders.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No reminders
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

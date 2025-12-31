import { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import {
    TruckIcon,
    Activity,
    AlertCircle,
    CheckCircle,
    DollarSign,
    User,
    ArrowLeft,
    Phone,
    Mail,
    Navigation,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays, format } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function FleetManagement() {
    const { vehicles, trips, expenses, drivers } = useVehicles();
    const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11

    // NAVIGATION STATE
    const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'vehicles'>('overview');
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

    // --- SHARED HELPERS ---
    const getVehicleImage = (type: string = "", make: string = "", model: string = "") => {
        const combined = `${type} ${make} ${model}`.toLowerCase();
        if (combined.includes("scooter") || combined.includes("activa") || combined.includes("dio")) return "https://img.icons8.com/fluency/240/scooter.png";
        if (combined.includes("bike") || combined.includes("motorcycle") || combined.includes("two_wheeler")) return "https://img.icons8.com/fluency/240/motorcycle.png";
        if (combined.includes("truck") || combined.includes("lorry") || combined.includes("pickup")) return "https://img.icons8.com/fluency/240/truck.png";
        if (combined.includes("bus") || combined.includes("coach")) return "https://img.icons8.com/fluency/240/bus.png";
        if (combined.includes("van") || combined.includes("tempo") || combined.includes("omni")) return "https://img.icons8.com/fluency/240/shuttle-bus.png";
        return "https://img.icons8.com/fluency/240/car.png";
    };

    // --- OVERVIEW DATA CALCS ---
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

    const calculateFleetHealth = () => {
        if (vehicles.length === 0) return 0;
        const healthyVehicles = vehicles.filter(v => {
            const daysSinceService = v.service_due_date
                ? differenceInDays(new Date(), parseISO(v.service_due_date))
                : 365;
            return daysSinceService < 90 && v.status === 'active';
        }).length;
        return Math.round((healthyVehicles / vehicles.length) * 100);
    };
    const fleetHealth = calculateFleetHealth();

    const statusData = [
        { name: 'Active', value: activeVehicles, color: '#10B981' },
        { name: 'Maintenance', value: maintenanceVehicles, color: '#F59E0B' },
        { name: 'Inactive', value: inactiveVehicles, color: '#EF4444' },
    ].filter(d => d.value > 0);

    const typeDistribution = vehicles.reduce((acc: any, v) => {
        const type = v.vehicle_type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    const typeData = Object.entries(typeDistribution).map(([name, value]) => ({ name, value }));

    const utilizationData = vehicles.map(v => {
        const vehicleTrips = trips.filter(t => t.vehicle_id === v.id).length;
        return { vehicle: v.vehicle_number, trips: vehicleTrips };
    }).sort((a, b) => b.trips - a.trips).slice(0, 10);

    const maintenanceAlerts = vehicles.filter(v => {
        if (!v.service_due_date) return true;
        const daysSinceService = differenceInDays(new Date(), parseISO(v.service_due_date));
        return daysSinceService > 90;
    });

    const getFilteredExpenses = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return expenses.filter(expense => {
            if (!expense.expense_date) return false;
            const expenseDate = parseISO(expense.expense_date);
            switch (selectedTimeRange) {
                case 'week':
                    const weekAgo = new Date(startOfToday);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return expenseDate >= weekAgo && expenseDate <= now;
                case 'month':
                    return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === now.getFullYear();
                case 'year':
                    const yearAgo = new Date(startOfToday);
                    yearAgo.setDate(yearAgo.getDate() - 365);
                    return expenseDate >= yearAgo && expenseDate <= now;
                default: return true;
            }
        });
    };
    const filteredExpenses = getFilteredExpenses();

    const expenseByVehicle = vehicles.map(v => {
        const vehicleExpenses = filteredExpenses
            .filter(e => e.vehicle_id === v.id)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        return { vehicle: v.vehicle_number, amount: vehicleExpenses };
    }).sort((a, b) => b.amount - a.amount).slice(0, 10);

    const totalFleetExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgExpensePerVehicle = vehicles.length > 0 ? totalFleetExpenses / vehicles.length : 0;

    const fuelData = trips.map(t => {
        const distance = (t.end_mileage || 0) - (t.start_mileage || 0);
        const fuel = t.fuel_consumed || 0;
        const efficiency = fuel > 0 ? distance / fuel : 0;
        const vehicle = vehicles.find(v => v.id === t.vehicle_id);
        return {
            vehicle: vehicle?.vehicle_number || 'Unknown',
            efficiency: efficiency.toFixed(2),
            distance,
            fuel,
        };
    }).filter(d => parseFloat(d.efficiency) > 0).slice(0, 10);

    // --- RENDER HELPERS ---
    const StatCard = ({ title, value, icon: Icon, gradient, subtitle }: any) => (
        <motion.div
            whileHover={{ translateY: -6, boxShadow: '0 12px 36px rgba(0,0,0,0.15)' }}
            className="rounded-2xl overflow-hidden p-6 text-white relative"
            style={{ background: gradient }}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-sm opacity-90 mb-2">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                    {subtitle && <p className="text-xs opacity-80 mt-2">{subtitle}</p>}
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                    <Icon className="h-8 w-8 text-white" />
                </div>
            </div>
        </motion.div>
    );

    // --- SUB-VIEWS ---

    // 1. DRIVER DETAILS
    if (selectedDriver) {
        // Calculate Driver Stats
        const driverTrips = trips.filter(t => t.driver_id === selectedDriver.id);
        // User ID link for expenses
        const driverExpenses = expenses.filter(e => e.user_id === selectedDriver.userId.id);

        const totalDistance = driverTrips.reduce((sum, t) => sum + ((t.end_mileage || 0) - (t.start_mileage || 0)), 0);
        const totalDriverExpenses = driverExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        return (
            <div className="p-6 space-y-6 animate-in slide-in-from-right duration-300">
                <button
                    onClick={() => setSelectedDriver(null)}
                    className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition mb-4 font-medium"
                >
                    <ArrowLeft size={20} /> Back to Drivers
                </button>

                {/* Profile Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border flex flex-col md:flex-row items-center md:items-start gap-8">
                    <img
                        src={selectedDriver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDriver.userId.name}`}
                        className="w-32 h-32 rounded-full border-4 border-indigo-50 shadow-lg object-cover"
                        alt={selectedDriver.userId.name}
                    />
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-slate-900">{selectedDriver.userId.name}</h1>
                        <p className="text-slate-500 mt-1 flex items-center justify-center md:justify-start gap-2">
                            <Mail size={16} /> {selectedDriver.userId.email}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${selectedDriver.status === 'Available' ? 'bg-green-50 border-green-200 text-green-700' :
                                    selectedDriver.status === 'On Trip' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600'
                                }`}>
                                {selectedDriver.status}
                            </span>
                            {selectedDriver.assigned_vehicle && (
                                <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-2">
                                    <TruckIcon size={14} /> Assigned: {selectedDriver.assigned_vehicle.vehicle_number}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto mt-6 md:mt-0">
                        <div className="p-4 bg-slate-50 rounded-xl text-center border">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Trips</p>
                            <p className="text-2xl font-bold text-slate-900">{driverTrips.length}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl text-center border">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Distance</p>
                            <p className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(0)} km</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl text-center border col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Expenses</p>
                            <p className="text-2xl font-bold text-indigo-600">₹{totalDriverExpenses.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Trips */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Navigation className="text-indigo-600" size={20} /> Recent Trips
                        </h3>
                        {driverTrips.length > 0 ? (
                            <div className="space-y-4">
                                {driverTrips.slice(0, 5).map((trip: any) => (
                                    <div key={trip.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-slate-800">{trip.route_start} ➝ {trip.route_end}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {format(parseISO(trip.trip_date), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                            <span className="text-sm font-bold text-slate-600">
                                                {trip.distance} km
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500 text-center py-8">No trips recorded.</p>}
                    </div>

                    {/* Recent Expenses */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <DollarSign className="text-green-600" size={20} /> Expense History
                        </h3>
                        {driverExpenses.length > 0 ? (
                            <div className="space-y-4">
                                {driverExpenses.slice(0, 5).map((exp: any) => (
                                    <div key={exp.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                                        <div>
                                            <p className="font-semibold text-slate-800 capitalize">{exp.category}</p>
                                            <p className="text-xs text-slate-500">{format(parseISO(exp.expense_date), 'dd MMM yyyy')}</p>
                                        </div>
                                        <p className="font-bold text-red-500">₹{exp.amount}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500 text-center py-8">No expenses recorded.</p>}
                    </div>
                </div>
            </div>
        );
    }

    // 2. VEHICLE DETAILS
    if (selectedVehicle) {
        // Calculate Vehicle Stats
        const vehicleTrips = trips.filter(t => t.vehicle_id === selectedVehicle.id);
        const vehicleExpenses = expenses.filter(e => e.vehicle_id === selectedVehicle.id);
        const totalVehicleDistance = vehicleTrips.reduce((sum, t) => sum + ((t.end_mileage || 0) - (t.start_mileage || 0)), 0);
        const totalVehicleExpenses = vehicleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        // Find assigned driver using the confirmed property 'assigned_driver_id'
        const currentDriver = drivers.find(d => d.id === selectedVehicle.assigned_driver_id);

        return (
            <div className="p-6 space-y-6 animate-in slide-in-from-right duration-300">
                <button
                    onClick={() => setSelectedVehicle(null)}
                    className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition mb-4 font-medium"
                >
                    <ArrowLeft size={20} /> Back to Vehicles
                </button>

                {/* Vehicle Header */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50 p-4">
                        <img
                            src={getVehicleImage(selectedVehicle.vehicle_type, selectedVehicle.make, selectedVehicle.model)}
                            className="w-full h-full object-contain"
                            alt="Vehicle"
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-slate-900">{selectedVehicle.make} {selectedVehicle.model}</h1>
                        <p className="text-xl font-mono text-slate-500 mt-1">{selectedVehicle.vehicle_number}</p>

                        <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize border ${selectedVehicle.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' :
                                    selectedVehicle.status === 'maintenance' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-red-50 border-red-200 text-red-700'
                                }`}>
                                {selectedVehicle.status}
                            </span>
                            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">
                                {selectedVehicle.vehicle_type}
                            </span>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto mt-6 md:mt-0">
                        <div className="p-4 bg-slate-50 rounded-xl text-center border">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Odometer</p>
                            <p className="text-2xl font-bold text-slate-900">{(selectedVehicle.start_mileage || 0 + totalVehicleDistance).toFixed(0)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl text-center border">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Trips</p>
                            <p className="text-2xl font-bold text-slate-900">{vehicleTrips.length}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl text-center border col-span-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Expenses</p>
                            <p className="text-2xl font-bold text-indigo-600">₹{totalVehicleExpenses.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Driver Card */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <User size={20} className="text-indigo-600" /> Assigned Driver
                        </h3>
                        {currentDriver ? (
                            <div className="flex items-center gap-4">
                                <img
                                    src={currentDriver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentDriver.userId.name}`}
                                    className="w-16 h-16 rounded-full border shadow-sm"
                                    alt="Driver"
                                />
                                <div>
                                    <p className="font-bold text-slate-900">{currentDriver.userId.name}</p>
                                    <p className="text-sm text-slate-500">{currentDriver.userId.email}</p>
                                    <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                                        <Phone size={10} /> Active
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed">
                                <p className="text-slate-500 italic">No driver currently assigned.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Trips */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Navigation size={20} className="text-blue-600" /> Trip History
                        </h3>
                        {vehicleTrips.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {vehicleTrips.slice(0, 4).map((trip: any) => (
                                    <div key={trip.id} className="p-3 bg-slate-50 rounded-lg border text-sm">
                                        <p className="font-semibold text-slate-800">{trip.route_start} ➝ {trip.route_end}</p>
                                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                                            <span>{trip.distance} km</span>
                                            <span>{trip.trip_date ? format(parseISO(trip.trip_date), 'dd MMM') : 'Ongoing'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500">No trips recorded.</p>}
                    </div>
                </div>
            </div>
        )
    }

    // --- MAIN OVERVIEW RENDER ---
    return (
        <div className="p-6 space-y-6 min-h-screen">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fleet Management</h1>
                    <p className="text-slate-500 mt-1">Monitor and optimize your fleet operations.</p>
                </div>

                {/* Master Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    {(['overview', 'drivers', 'vehicles'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 capitalize ${activeTab === tab
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Time Filter (Only for overview stats) */}
                    <div className="flex justify-end gap-2">
                        {selectedTimeRange === 'month' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="px-3 py-2 rounded-lg border bg-white text-sm"
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        )}
                        < div className="flex bg-slate-100 rounded-lg p-1">
                            {(['week', 'month', 'year'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setSelectedTimeRange(range)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${selectedTimeRange === range ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Fleet Size" value={totalVehicles} icon={TruckIcon} gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" subtitle={`${activeVehicles} active vehicles`} />
                        <StatCard title="Fleet Health Score" value={`${fleetHealth}%`} icon={Activity} gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" subtitle="Based on maintenance status" />
                        <StatCard title="Total Expenses" value={`₹${(totalFleetExpenses / 1000).toFixed(1)}K`} icon={DollarSign} gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" subtitle={`₹${avgExpensePerVehicle.toFixed(0)} avg/vehicle`} />
                        <StatCard title="Maintenance Alerts" value={maintenanceAlerts.length} icon={AlertCircle} gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)" subtitle="Vehicles need attention" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="font-bold text-slate-800 mb-4">Fleet Status</h3>
                            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{statusData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="font-bold text-slate-800 mb-4">Top 5 Utilized Vehicles</h3>
                            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={utilizationData.slice(0, 5)} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="vehicle" type="category" width={80} /><Tooltip /><Bar dataKey="trips" fill="#8b5cf6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
                        </div>
                    </div>

                    {/* Expense by Vehicle Table */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border">
                        <h3 className="font-bold text-slate-800 mb-4">Top 5 Expensive Vehicles</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={expenseByVehicle} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="vehicle" type="category" width={80} />
                                    <Tooltip formatter={(value: any) => `₹${value}`} />
                                    <Bar dataKey="amount" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'drivers' && (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {drivers.map(driver => (
                            <motion.div
                                key={driver.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedDriver(driver)}
                                className="bg-white p-6 rounded-2xl shadow-sm border hover:border-indigo-300 hover:shadow-md cursor-pointer transition group"
                            >
                                <div className="flex items-center gap-4">
                                    <img
                                        src={driver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.userId.name}`}
                                        className="w-16 h-16 rounded-full border shadow-sm object-cover group-hover:ring-2 ring-indigo-500 transition"
                                        alt={driver.userId.name}
                                    />
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition">{driver.userId.name}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${driver.status === 'Available' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                            {driver.status}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                                    <div className="text-center">
                                        <p className="text-slate-400 text-xs uppercase">Vehicle</p>
                                        <p className="font-semibold text-slate-700">{driver.assigned_vehicle?.vehicle_number || 'None'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-400 text-xs uppercase">Trips</p>
                                        <p className="font-semibold text-slate-700">{trips.filter(t => t.driver_id === driver.id).length}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-400 text-xs uppercase">Action</p>
                                        <p className="font-semibold text-indigo-600">View Details</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'vehicles' && (
                <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vehicles.map(vehicle => (
                            <motion.div
                                key={vehicle.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedVehicle(vehicle)}
                                className="bg-white p-6 rounded-2xl shadow-sm border hover:border-indigo-300 hover:shadow-md cursor-pointer transition group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition">{vehicle.make} {vehicle.model}</h3>
                                        <p className="font-mono text-sm text-slate-500">{vehicle.vehicle_number}</p>
                                    </div>
                                    <img
                                        src={getVehicleImage(vehicle.vehicle_type, vehicle.make, vehicle.model)}
                                        className="w-12 h-12 object-contain"
                                    />
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <span className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${vehicle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {vehicle.status}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                                        {vehicle.vehicle_type}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase">Driver</p>
                                        <p className="text-sm font-semibold truncate">
                                            {drivers.find(d => d.id === vehicle.assigned_driver_id)?.userId.name || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 uppercase">Fuel Eff.</p>
                                        <p className="text-sm font-semibold text-green-600">
                                            {fuelData.find(f => f.vehicle === vehicle.vehicle_number)?.efficiency || '-'} km/L
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

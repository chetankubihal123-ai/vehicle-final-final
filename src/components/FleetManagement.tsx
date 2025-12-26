import { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import {
    TruckIcon,
    Activity,
    AlertCircle,
    CheckCircle,
    MapPin,
    Fuel,
    DollarSign,
    TrendingUp,
    TrendingDown,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays } from 'date-fns';
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

    // Fleet Statistics
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

    // Fleet Health Score (based on maintenance and age)
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

    // Vehicle Status Distribution
    const statusData = [
        { name: 'Active', value: activeVehicles, color: '#10B981' },
        { name: 'Maintenance', value: maintenanceVehicles, color: '#F59E0B' },
        { name: 'Inactive', value: inactiveVehicles, color: '#EF4444' },
    ].filter(d => d.value > 0);

    // Vehicle Type Distribution
    const typeDistribution = vehicles.reduce((acc: any, v) => {
        const type = v.vehicle_type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const typeData = Object.entries(typeDistribution).map(([name, value]) => ({
        name,
        value,
    }));

    // Utilization Rate (trips per vehicle)
    const utilizationData = vehicles.map(v => {
        const vehicleTrips = trips.filter(t => t.vehicle_id === v.id).length;
        return {
            vehicle: v.vehicle_number,
            trips: vehicleTrips,
        };
    }).sort((a, b) => b.trips - a.trips).slice(0, 10);

    // Maintenance Alerts
    const maintenanceAlerts = vehicles.filter(v => {
        if (!v.service_due_date) return true;
        const daysSinceService = differenceInDays(new Date(), parseISO(v.service_due_date));
        return daysSinceService > 90;
    });

    // Expense by Vehicle
    const expenseByVehicle = vehicles.map(v => {
        const vehicleExpenses = expenses
            .filter(e => e.vehicle_id === v.id)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        return {
            vehicle: v.vehicle_number,
            amount: vehicleExpenses,
        };
    }).sort((a, b) => b.amount - a.amount).slice(0, 10);

    // Total Fleet Expenses
    const totalFleetExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgExpensePerVehicle = vehicles.length > 0 ? totalFleetExpenses / vehicles.length : 0;

    // Fuel Efficiency
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

    const StatCard = ({ title, value, icon: Icon, gradient, subtitle, trend }: any) => (
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
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : (
                                <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="text-xs">{Math.abs(trend)}% vs last period</span>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                    <Icon className="h-8 w-8 text-white" />
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Fleet Management</h1>
                    <p className="text-gray-500 mt-1">
                        Monitor and optimize your entire fleet performance
                    </p>
                </div>
                <div className="flex gap-2">
                    {(['week', 'month', 'year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setSelectedTimeRange(range)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${selectedTimeRange === range
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Fleet Size"
                    value={totalVehicles}
                    icon={TruckIcon}
                    gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    subtitle={`${activeVehicles} active vehicles`}
                />
                <StatCard
                    title="Fleet Health Score"
                    value={`${fleetHealth}%`}
                    icon={Activity}
                    gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    subtitle="Based on maintenance status"
                />
                <StatCard
                    title="Total Expenses"
                    value={`₹${(totalFleetExpenses / 1000).toFixed(1)}K`}
                    icon={DollarSign}
                    gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                    subtitle={`₹${avgExpensePerVehicle.toFixed(0)} avg/vehicle`}
                />
                <StatCard
                    title="Maintenance Alerts"
                    value={maintenanceAlerts.length}
                    icon={AlertCircle}
                    gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                    subtitle="Vehicles need attention"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vehicle Status Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Fleet Status Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vehicle Type Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TruckIcon className="h-5 w-5 text-indigo-600" />
                        Vehicle Type Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vehicle Utilization */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-indigo-600" />
                        Top 10 Most Utilized Vehicles
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={utilizationData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="vehicle" type="category" width={80} />
                                <Tooltip />
                                <Bar dataKey="trips" fill="#10b981" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense by Vehicle */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-indigo-600" />
                        Top 10 Expensive Vehicles
                    </h3>
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

            {/* Maintenance Alerts */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Maintenance Alerts ({maintenanceAlerts.length})
                </h3>
                {maintenanceAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {maintenanceAlerts.map((vehicle) => {
                            const daysSinceService = vehicle.service_due_date
                                ? differenceInDays(new Date(), parseISO(vehicle.service_due_date))
                                : null;
                            return (
                                <motion.div
                                    key={vehicle.id}
                                    whileHover={{ scale: 1.02 }}
                                    className="border-l-4 border-red-500 bg-red-50 p-4 rounded-lg"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900">{vehicle.vehicle_number}</p>
                                            <p className="text-sm text-gray-600">
                                                {vehicle.make} {vehicle.model}
                                            </p>
                                            <p className="text-xs text-red-600 mt-2">
                                                {daysSinceService
                                                    ? `${daysSinceService} days since last service`
                                                    : 'No service record'}
                                            </p>
                                        </div>
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p>All vehicles are up to date with maintenance!</p>
                    </div>
                )}
            </div>

            {/* Fuel Efficiency Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-indigo-600" />
                    Fuel Efficiency Report
                </h3>
                {fuelData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Vehicle</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Distance (km)</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Fuel (L)</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Efficiency (km/L)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fuelData.map((data, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{data.vehicle}</td>
                                        <td className="py-3 px-4 text-right">{data.distance}</td>
                                        <td className="py-3 px-4 text-right">{data.fuel}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                                {data.efficiency}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No fuel efficiency data available</p>
                    </div>
                )}
            </div>

            {/* Active Fleet Assignments */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-600" />
                        Active Fleet Assignments
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                        {drivers.filter(d => d.assigned_vehicle).length} Drivers Assigned
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drivers.map((driver) => (
                        <motion.div
                            key={driver.id}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-100 group"
                        >
                            <div className="relative">
                                <img
                                    src={driver.userId.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.userId.name}`}
                                    alt={driver.userId.name}
                                    className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover"
                                />
                                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${driver.status === 'Available' ? 'bg-green-500' :
                                    driver.status === 'On Trip' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />
                            </div>
                            <div className="ml-4 flex-1">
                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                    {driver.userId.name}
                                </h4>
                                <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <TruckIcon className="h-3 w-3 mr-1" />
                                    {driver.assigned_vehicle ? (
                                        <span className="font-semibold text-slate-700">
                                            {driver.assigned_vehicle.vehicle_number}
                                            <span className="mx-1 opacity-50">•</span>
                                            {driver.assigned_vehicle.make}
                                        </span>
                                    ) : (
                                        <span className="italic">Unassigned</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    ID: {driver.id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                    {drivers.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <TruckIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No drivers registered in your fleet yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import VehicleTracker from './VehicleTracker';
import { MapPin, Car, Clock, X } from 'lucide-react';

interface Vehicle {
    _id: string;
    registrationNumber: string;
    make?: string;
    model?: string;
    type: string;
    currentDriver?: {
        _id: string;
        name: string;
    };
    currentLocation?: {
        coordinates: [number, number];
        timestamp: Date;
        speed?: number;
    };
}

export default function LiveTracking() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVehicles();
        // Refresh vehicle list every 30 seconds
        const interval = setInterval(fetchVehicles, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchVehicles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/vehicles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVehicles(response.data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLastUpdateTime = (vehicle: Vehicle) => {
        if (!vehicle.currentLocation?.timestamp) return 'Never';
        const date = new Date(vehicle.currentLocation.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return `${Math.floor(diffMinutes / 1440)}d ago`;
    };

    const isLocationRecent = (vehicle: Vehicle) => {
        if (!vehicle.currentLocation?.timestamp) return false;
        const date = new Date(vehicle.currentLocation.timestamp);
        const now = new Date();
        const diffMinutes = (now.getTime() - date.getTime()) / 60000;
        return diffMinutes < 5; // Consider recent if updated within 5 minutes
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading vehicles...</p>
                </div>
            </div>
        );
    }

    if (selectedVehicle) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelectedVehicle(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                    <X className="h-4 w-4" />
                    Back to Vehicles
                </button>
                <VehicleTracker
                    vehicleId={selectedVehicle._id}
                    vehicleName={`${selectedVehicle.registrationNumber} - ${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`}
                />
            </div>
        );
    }

    const vehiclesWithDrivers = vehicles.filter(v => v.currentDriver);
    const activeVehicles = vehiclesWithDrivers.filter(isLocationRecent);
    const inactiveVehicles = vehiclesWithDrivers.filter(v => !isLocationRecent(v));

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Live Vehicle Tracking</h2>
                <p className="text-gray-600">
                    Select a vehicle to view its real-time location on the map
                </p>
            </div>

            {/* Active Vehicles */}
            {activeVehicles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Active Now ({activeVehicles.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeVehicles.map((vehicle) => (
                            <VehicleCard
                                key={vehicle._id}
                                vehicle={vehicle}
                                isActive={true}
                                onClick={() => setSelectedVehicle(vehicle)}
                                lastUpdate={getLastUpdateTime(vehicle)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Inactive Vehicles */}
            {inactiveVehicles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Inactive ({inactiveVehicles.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inactiveVehicles.map((vehicle) => (
                            <VehicleCard
                                key={vehicle._id}
                                vehicle={vehicle}
                                isActive={false}
                                onClick={() => setSelectedVehicle(vehicle)}
                                lastUpdate={getLastUpdateTime(vehicle)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {vehiclesWithDrivers.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        No Vehicles with Assigned Drivers
                    </h3>
                    <p className="text-gray-600">
                        Assign drivers to your vehicles to enable live tracking
                    </p>
                </div>
            )}
        </div>
    );
}

interface VehicleCardProps {
    vehicle: Vehicle;
    isActive: boolean;
    onClick: () => void;
    lastUpdate: string;
}

function VehicleCard({ vehicle, isActive, onClick, lastUpdate }: VehicleCardProps) {
    return (
        <button
            onClick={onClick}
            className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${isActive
                ? 'border-green-200 bg-green-50 hover:bg-green-100'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
                        <Car className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">{vehicle.registrationNumber}</p>
                        <p className="text-sm text-gray-600">
                            {vehicle.make} {vehicle.model}
                        </p>
                    </div>
                </div>
                {isActive && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        LIVE
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Driver:</span>
                    <span>{vehicle.currentDriver?.name || 'Unassigned'}</span>
                </div>

                {vehicle.currentLocation && (
                    <>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="h-4 w-4" />
                            <span>Last update: {lastUpdate}</span>
                        </div>
                        {vehicle.currentLocation.speed !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <span className="font-medium">Speed:</span>
                                <span>{vehicle.currentLocation.speed} km/h</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-blue-600">Click to view on map →</p>
            </div>
        </button>
    );
}

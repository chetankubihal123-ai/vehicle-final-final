// src/components/LiveTracking.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import VehicleTracker from "./VehicleTracker";
import { MapPin, Car, Clock, X } from "lucide-react";

interface Vehicle {
  _id: string;
  registrationNumber: string;
  make?: string;
  model?: string;
  type: string;
  currentDriver?: {
    _id: string;
    userId: {
      _id: string;
      name: string;
    };
  };
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
  };
}

export default function LiveTracking() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get(`${API_URL}/api/vehicles`, { headers });
      const baseVehicles: Vehicle[] = res.data;

      // attach live location for each vehicle
      const withLive = await Promise.all(
        baseVehicles.map(async (v) => {
          try {
            const liveRes = await axios.get(
              `${API_URL}/api/location/live/${v._id}`,
              { headers }
            );
            const live = liveRes.data;
            return {
              ...v,
              currentLocation: {
                lat: live.lat,
                lng: live.lng,
                timestamp: live.timestamp,
                speed: live.speed || 0,
              },
            } as Vehicle;
          } catch {
            return v;
          }
        })
      );

      setVehicles(withLive);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLastUpdateTime = (vehicle: Vehicle) => {
    if (!vehicle.currentLocation?.timestamp) return "Never";
    const date = new Date(vehicle.currentLocation.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / 60000
    );

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const isLocationRecent = (vehicle: Vehicle) => {
    if (!vehicle.currentLocation?.timestamp) return false;
    const date = new Date(vehicle.currentLocation.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs < 30_000; // 30 sec -> active
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
          vehicleName={`${selectedVehicle.registrationNumber} - ${selectedVehicle.make || ""
            } ${selectedVehicle.model || ""}`}
        />
      </div>
    );
  }

  const vehiclesWithDrivers = vehicles.filter((v) => v.currentDriver);
  const activeVehicles = vehiclesWithDrivers.filter(isLocationRecent);
  const inactiveVehicles = vehiclesWithDrivers.filter(
    (v) => !isLocationRecent(v)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Live Vehicle Tracking
        </h2>
        <p className="text-gray-600">
          Select a vehicle to view its real-time location on the map
        </p>
      </div>

      {/* Active */}
      {activeVehicles.length > 0 && (
        <VehicleSection
          title={`Active Now (${activeVehicles.length})`}
          dotClass="bg-green-500 animate-pulse"
          vehicles={activeVehicles}
          onSelect={setSelectedVehicle}
          getLastUpdate={getLastUpdateTime}
          active
        />
      )}

      {/* Inactive */}
      {inactiveVehicles.length > 0 && (
        <VehicleSection
          title={`Inactive (${inactiveVehicles.length})`}
          dotClass="bg-gray-400"
          vehicles={inactiveVehicles}
          onSelect={setSelectedVehicle}
          getLastUpdate={getLastUpdateTime}
          active={false}
        />
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

function VehicleSection({
  title,
  dotClass,
  vehicles,
  onSelect,
  getLastUpdate,
  active,
}: {
  title: string;
  dotClass: string;
  vehicles: Vehicle[];
  onSelect: (v: Vehicle | null) => void;
  getLastUpdate: (v: Vehicle) => string;
  active: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-3 w-3 rounded-full ${dotClass}`}></div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <button
            key={vehicle._id}
            onClick={() => onSelect(vehicle)}
            className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${active
              ? "border-green-200 bg-green-50 hover:bg-green-100"
              : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${active ? "bg-green-500" : "bg-gray-400"
                    }`}
                >
                  <Car className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {vehicle.registrationNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {vehicle.make} {vehicle.model}
                  </p>
                </div>
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${active
                  ? "text-green-700 bg-green-100"
                  : "text-red-700 bg-red-100"
                  }`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-500" : "bg-red-500"
                    }`}
                ></div>
                {active ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Driver:</span>
                <span>{vehicle.currentDriver?.userId?.name || "Unassigned"}</span>
              </div>

              {vehicle.currentLocation && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4" />
                    <span>Last update: {getLastUpdate(vehicle)}</span>
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
              <p className="text-sm font-medium text-blue-600">
                Click to view on map →
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

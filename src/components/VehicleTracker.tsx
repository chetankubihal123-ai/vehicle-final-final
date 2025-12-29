// src/components/VehicleTracker.tsx
import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin, Gauge, Clock, Radio } from "lucide-react";
import axios from "axios";
import { API_URL } from "../config";
import { socket } from "../socket";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface VehicleLocation {
  lat: number;
  lng: number;
  speed: number;
  timestamp: Date;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

interface Props {
  vehicleId: string;
  vehicleName: string;
  onSaveTrip?: (data: { startTime: Date; distance: number; startLocation: string; endLocation: string }) => void;
}

export default function VehicleTracker({ vehicleId, vehicleName, onSaveTrip }: Props) {
  // Start with neutral default; will be overwritten as soon as we have real data
  const [currentLocation, setCurrentLocation] = useState<VehicleLocation>({
    lat: 12.9716,
    lng: 77.5946,
    speed: 0,
    timestamp: new Date(),
  });

  const [locationHistory, setLocationHistory] = useState<[number, number][]>(
    []
  );
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isGPSStale, setIsGPSStale] = useState(true);
  const [justReceivedUpdate, setJustReceivedUpdate] = useState(false);

  const socketRef = useRef<typeof socket | null>(null);
  const STALE_MS = 30_000; // 30 seconds

  // --------------------------------
  // 1. SOCKET: live updates
  // --------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[OWNER] No token; cannot connect socket");
      return;
    }

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    socketRef.current = socket;

    const handleConnect = () => {
      console.log("[OWNER] socket connected:", socket.id);
      setIsSocketConnected(true);
      console.log("[OWNER] join_vehicle =>", vehicleId);
      socket.emit("join_vehicle", vehicleId);
    };

    const handleDisconnect = () => {
      console.log("[OWNER] socket disconnected");
      setIsSocketConnected(false);
    };

    const handleConnectError = (err: any) => {
      console.error("[OWNER] socket connect_error:", err.message);
      setIsSocketConnected(false);
    };

    const handleReceiveLocation = (data: any) => {
      console.log("[OWNER] receive_location »", data);
      if (!data || data.vehicleId !== vehicleId || !data.location) return;

      const { lat, lng, speed, timestamp } = data.location;

      // Ignore invalid payloads
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        console.warn("[OWNER] received invalid coordinates, ignoring", data);
        return;
      }

      const ts = timestamp ? new Date(timestamp) : new Date();

      const loc: VehicleLocation = {
        lat,
        lng,
        speed: typeof speed === "number" ? speed : 0,
        timestamp: ts,
      };

      console.log("[OWNER] ✓ Valid location update:", loc);

      setCurrentLocation(loc);
      setLocationHistory((prev) =>
        [...prev, [loc.lat, loc.lng] as [number, number]]
      );

      const diff = Date.now() - ts.getTime();
      setIsGPSStale(diff > STALE_MS);

      // Show visual feedback for new update
      setJustReceivedUpdate(true);
      setTimeout(() => setJustReceivedUpdate(false), 2000);
    };

    const handleReceiveRouteHistory = (points: { lat: number, lng: number, timestamp: any }[]) => {
      console.log("[OWNER] receive_route_history (total pts):", points.length);
      const history = points.map(p => [p.lat, p.lng] as [number, number]);
      setLocationHistory(history);

      if (points.length > 0) {
        const last = points[points.length - 1];
        setCurrentLocation({
          lat: last.lat,
          lng: last.lng,
          speed: 0,
          timestamp: new Date(last.timestamp)
        });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receive_location", handleReceiveLocation);
    socket.on("receive_route_history", handleReceiveRouteHistory);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receive_location", handleReceiveLocation);
      socket.off("receive_route_history", handleReceiveRouteHistory);
      socket.disconnect();
    };
  }, [vehicleId]);

  // --------------------------------
  // 1.5 PERIODIC STALENESS CHECK
  // --------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLocation.timestamp) {
        const diff = Date.now() - currentLocation.timestamp.getTime();
        setIsGPSStale(diff > STALE_MS);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [currentLocation.timestamp, STALE_MS]);

  // --------------------------------
  // 2. INITIAL LOAD (REST)
  // --------------------------------
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Get Live Location
        try {
          const liveRes = await axios.get(
            `${API_URL}/api/location/live/${vehicleId}`,
            { headers }
          );
          if (liveRes.data) {
            const { lat, lng, speed, timestamp } = liveRes.data;
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              const ts = timestamp ? new Date(timestamp) : new Date();
              setCurrentLocation({
                lat,
                lng,
                speed: speed || 0,
                timestamp: ts,
              });
              setIsGPSStale(Date.now() - ts.getTime() > STALE_MS);
            }
          }
        } catch (e) {
          // ignore 404
        }

        // 2. Get History
        try {
          const historyRes = await axios.get(
            `${API_URL}/api/location/history/${vehicleId}`,
            { headers }
          );

          if (historyRes.data?.locations?.length) {
            const serverPts = historyRes.data.locations
              .filter((p: any) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng))
              .map((p: any) => ({
                lat: p.lat,
                lng: p.lng,
                timestamp: new Date(p.timestamp).getTime()
              }));

            // Merge with existing state carefully
            setLocationHistory(() => {
              const formattedServerPts = serverPts.map((p: any) => [p.lat, p.lng] as [number, number]);
              return formattedServerPts;
            });
          }
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.error("[OWNER] initial load error:", err);
      }
    };

    loadInitial();
  }, [vehicleId]);

  const customIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const driverOnline = !isGPSStale;

  return (
    <div className="space-y-4">
      {/* STATUS BAR */}
      <div
        className={`border rounded-lg p-3 flex items-center justify-between ${driverOnline
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
          }`}
      >
        <div className="flex items-center gap-2">
          <Radio
            className={`h-5 w-5 ${driverOnline ? "text-green-600 animate-pulse" : "text-red-600"
              }`}
          />
          <div>
            <p
              className={`text-sm font-medium ${driverOnline ? "text-green-800" : "text-red-800"
                }`}
            >
              {driverOnline ? "Driver Online" : "Driver Offline"}
            </p>
            <p className="text-xs text-gray-600">
              Socket: {isSocketConnected ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>

        {/* New Update Indicator */}
        {justReceivedUpdate && (
          <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
            <span className="h-2 w-2 bg-white rounded-full"></span>
            Location Updated
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<MapPin className="h-5 w-5 text-green-700" />}
          title="Location"
          value={`${currentLocation.lat.toFixed(
            6
          )}, ${currentLocation.lng.toFixed(6)}`}
          color="green"
        />
        <StatCard
          icon={<Gauge className="h-5 w-5 text-blue-700" />}
          title="Speed"
          value={`${currentLocation.speed.toFixed(1)} km/h`}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-purple-700" />}
          title="Last Update"
          value={currentLocation.timestamp.toLocaleTimeString()}
          color="purple"
        />
      </div>

      {/* MAP */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-3 bg-indigo-600 text-white flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          <span>Live Map</span>
        </div>

        <div style={{ height: 500 }}>
          <MapContainer
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={16}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satellite">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <MapController
              center={[currentLocation.lat, currentLocation.lng]}
            />

            <Marker
              position={[currentLocation.lat, currentLocation.lng]}
              icon={customIcon}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -36]}
                opacity={1}
                className="bg-white px-2 py-1 rounded shadow text-sm font-bold border border-gray-200 text-gray-800"
              >
                {vehicleName || "Vehicle"}
              </Tooltip>
              <Popup>
                <b>{vehicleName}</b>
                <br />
                Speed: {currentLocation.speed.toFixed(1)} km/h
                <br />
                {currentLocation.timestamp.toLocaleTimeString()}
              </Popup>
            </Marker>

            {locationHistory.length > 1 && (
              <Polyline
                positions={locationHistory}
                color="#7c3aed"
                weight={5}
                opacity={0.8}
                smoothFactor={1}
                lineCap="round"
                lineJoin="round"
                dashArray={isGPSStale ? "10, 10" : undefined}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: JSX.Element;
  title: string;
  value: string;
  color: "green" | "blue" | "purple";
}) {
  const colors: Record<
    string,
    { bg: string; border: string; pill: string }
  > = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      pill: "bg-green-500",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      pill: "bg-blue-500",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      pill: "bg-purple-500",
    },
  };

  const c = colors[color];

  return (
    <div className={`p-4 rounded-lg border ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.pill}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

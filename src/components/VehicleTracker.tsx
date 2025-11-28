import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Gauge, Clock, Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../config';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VehicleLocation {
    lat: number;
    lng: number;
    speed: number;
    timestamp: Date;
}

// Component to auto-center map on vehicle
function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 15);
    }, [center, map]);
    return null;
}

interface VehicleTrackerProps {
    vehicleId: string;
    vehicleName: string;
}

export default function VehicleTracker({ vehicleId, vehicleName }: VehicleTrackerProps) {
    const [currentLocation, setCurrentLocation] = useState<VehicleLocation>({
        lat: 18.5204, // Default: Pune, India
        lng: 73.8567,
        speed: 0,
        timestamp: new Date(),
    });
    const [locationHistory, setLocationHistory] = useState<[number, number][]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Initialize Socket.io
    useEffect(() => {
        // Dynamically connect to the backend on the same IP as the frontend
        const socketUrl = `http://${window.location.hostname}:5000`;
        console.log('Connecting to socket at:', socketUrl);

        socketRef.current = io(socketUrl);

        socketRef.current.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
            socketRef.current?.emit('join_vehicle', vehicleId);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        // Listen for updates from the REST API (DriverLocationService)
        socketRef.current.on('location-update', (data: any) => {
            if (data.vehicleId === vehicleId) {
                console.log('📍 Received location update:', data);
                const newLoc = {
                    lat: data.latitude,
                    lng: data.longitude,
                    speed: data.speed || 0,
                    timestamp: new Date(data.timestamp),
                };
                setCurrentLocation(newLoc);
                setLocationHistory(prev => [...prev, [data.latitude, data.longitude] as [number, number]].slice(-100));
            }
        });

        // Listen for updates from direct socket events (if any)
        socketRef.current.on('receive_location', (data: any) => {
            if (data.vehicleId === vehicleId) {
                console.log('📍 Received direct socket location:', data);
                const newLoc = {
                    lat: data.location.lat,
                    lng: data.location.lng,
                    speed: data.location.speed || 0,
                    timestamp: new Date(data.location.timestamp),
                };
                setCurrentLocation(newLoc);
                setLocationHistory(prev => [...prev, [data.location.lat, data.location.lng] as [number, number]].slice(-100));
            }
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [vehicleId]);

    // Fetch initial vehicle data from API
    useEffect(() => {
        const fetchVehicleData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/vehicles/${vehicleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const vehicle = response.data;

                if (vehicle.currentLocation && vehicle.currentLocation.coordinates) {
                    const lng = vehicle.currentLocation.coordinates[0];
                    const lat = vehicle.currentLocation.coordinates[1];

                    // Only use coordinates if they're valid (not 0,0)
                    if (lat !== 0 && lng !== 0) {
                        setCurrentLocation({
                            lat: lat,
                            lng: lng,
                            speed: vehicle.currentLocation.speed || 0,
                            timestamp: new Date(vehicle.currentLocation.timestamp || new Date()),
                        });
                    }
                }

                if (vehicle.locationHistory && vehicle.locationHistory.length > 0) {
                    const history = vehicle.locationHistory
                        .filter((pt: any) => pt.coordinates[1] !== 0 && pt.coordinates[0] !== 0)
                        .map((pt: any) => [pt.coordinates[1], pt.coordinates[0]] as [number, number]);

                    if (history.length > 0) {
                        setLocationHistory(history);
                    }
                }
            } catch (err) {
                console.error('Error fetching vehicle data:', err);
            }
        };

        if (vehicleId) {
            fetchVehicleData();
        }
    }, [vehicleId]);

    // Initialize tracking history with current location if empty
    useEffect(() => {
        if (locationHistory.length === 0 && currentLocation.lat !== 0 && currentLocation.lng !== 0) {
            setLocationHistory([[currentLocation.lat, currentLocation.lng]]);
        }
    }, [currentLocation]);

    const customIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    return (
        <div className="space-y-4">
            {/* Status Indicator */}
            <div className={`border rounded-lg p-3 flex items-center justify-between ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                    <Radio className={`h-5 w-5 ${isConnected ? 'text-green-600 animate-pulse' : 'text-red-600'}`} />
                    <div>
                        <p className={`text-sm font-medium ${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                            {isConnected ? 'Live Connection Active' : 'Connecting to Vehicle...'}
                        </p>
                        <p className="text-xs text-gray-600">
                            Viewing real-time location for {vehicleName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Vehicle Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Current Location</p>
                            <p className="font-semibold text-gray-900">
                                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Gauge className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Current Speed</p>
                            <p className="font-semibold text-gray-900">{currentLocation.speed} km/h</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Update</p>
                            <p className="font-semibold text-gray-900">
                                {currentLocation.timestamp.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-5 w-5" />
                            <h3 className="font-semibold">Live Map View</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                </div>

                <div style={{ height: '500px', width: '100%' }}>
                    <MapContainer
                        center={[currentLocation.lat, currentLocation.lng]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapController center={[currentLocation.lat, currentLocation.lng]} />

                        {/* Vehicle Marker */}
                        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={customIcon}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-semibold">{vehicleName}</p>
                                    <p className="text-sm text-gray-600">Speed: {currentLocation.speed} km/h</p>
                                    <p className="text-xs text-gray-500">
                                        {currentLocation.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Route History */}
                        {locationHistory.length > 1 && (
                            <Polyline
                                positions={locationHistory}
                                color="#7c3aed"
                                weight={3}
                                opacity={0.7}
                            />
                        )}
                    </MapContainer>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Radio className="h-4 w-4" />
                    Waiting for driver to share location...
                </p>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react';

interface LocationData {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy: number;
    speed?: number;
}

export const MobileLocationTracker = () => {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [updateCount, setUpdateCount] = useState(0);

    const sendLocationToBackend = async (locationData: LocationData) => {
        try {
            const token = localStorage.getItem('token');
            const vehicleId = localStorage.getItem('assignedVehicleId');

            if (!token || !vehicleId) {
                setError('Not logged in or no vehicle assigned');
                return;
            }

            await axios.post(
                `${API_URL}/api/vehicles/${vehicleId}/location`,
                {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    timestamp: locationData.timestamp,
                    speed: locationData.speed
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setLastUpdateTime(new Date());
            setUpdateCount(prev => prev + 1);
        } catch (err: any) {
            console.error('Error sending location:', err);
            setError(`Failed to update location: ${err.response?.data?.message || err.message}`);
        }
    };

    const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null);

    // Helper to calculate distance between two points in meters
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    useEffect(() => {
        if (!isTracking) return;

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setIsTracking(false);
            return;
        }

        let watchId: number;

        // Request permission and start watching
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                let { latitude, longitude, accuracy, speed } = position.coords;

                // --- FILTERING FOR ACCURACY & JITTER ---
                // 1. Ignore low accuracy points (if accuracy > 30 meters)
                if (accuracy > 30 && prevLocationRef.current !== null) {
                    console.log("[MOBILE] Poor accuracy, skipping:", accuracy);
                    return;
                }

                let sentSpeed = speed ?? 0;
                if (sentSpeed < 0.5) sentSpeed = 0; // Force 0 for very low speeds

                // 2. Filter by distance
                if (prevLocationRef.current) {
                    const dist = getDistance(
                        prevLocationRef.current.lat,
                        prevLocationRef.current.lng,
                        latitude,
                        longitude
                    );

                    // Threshold 1: If moved < 2 meters, don't move the map point at all
                    if (dist < 2) {
                        latitude = prevLocationRef.current.lat;
                        longitude = prevLocationRef.current.lng;
                        sentSpeed = 0;
                    }

                    // Threshold 2: If moved < 5 meters, assume stationary
                    if (dist < 5) {
                        sentSpeed = 0;
                        // If already signaled as stationary, don't spam the server
                        if (location?.speed === 0 && dist < 1) {
                            return;
                        }
                    }
                }

                const locationData: LocationData = {
                    latitude,
                    longitude,
                    timestamp: new Date(),
                    accuracy,
                    speed: sentSpeed
                };

                // Update state and refs
                prevLocationRef.current = { latitude, longitude } as any; // adapting to ref structure
                setLocation(locationData);
                setError(''); // Clear any previous errors

                // Send to backend
                sendLocationToBackend(locationData);
            },
            (err) => {
                let errorMessage = '';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable. Make sure GPS is enabled.';
                        break;
                    case err.TIMEOUT:
                        errorMessage = 'Location request timed out. Retrying...';
                        break;
                    default:
                        errorMessage = `Error getting location: ${err.message}`;
                }
                setError(errorMessage);
            },
            {
                enableHighAccuracy: true, // Use GPS for best accuracy
                timeout: 10000, // 10 seconds timeout
                maximumAge: 1000 // Don't use cached location
            }
        );

        // Cleanup
        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isTracking]);

    const toggleTracking = () => {
        if (!isTracking) {
            // Reset error when starting
            setError('');
            setUpdateCount(0);
        }
        setIsTracking(!isTracking);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-2xl shadow-lg p-6">
                    <div className="flex items-center justify-center mb-2">
                        <Navigation className="w-8 h-8 text-indigo-600 mr-2" />
                        <h1 className="text-2xl font-bold text-gray-800">Vehicle Tracker</h1>
                    </div>
                    <p className="text-center text-gray-600 text-sm">
                        Share your live location with dispatch
                    </p>
                </div>

                {/* Status Card */}
                <div className="bg-white shadow-lg p-6">
                    <div className={`flex items-center justify-center p-4 rounded-lg mb-4 ${isTracking
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-100 border-2 border-gray-300'
                        }`}>
                        <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-2 ${isTracking ? 'bg-green-500' : 'bg-gray-400'
                                }`}>
                                {isTracking ? (
                                    <CheckCircle className="w-8 h-8 text-white" />
                                ) : (
                                    <MapPin className="w-8 h-8 text-white" />
                                )}
                            </div>
                            <h2 className={`text-xl font-bold ${isTracking ? 'text-green-700' : 'text-gray-700'
                                }`}>
                                {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
                            </h2>
                            {isTracking && (
                                <p className="text-sm text-green-600 mt-1">
                                    Updates sent: {updateCount}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Control Button */}
                    <button
                        onClick={toggleTracking}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg ${isTracking
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                            }`}
                    >
                        {isTracking ? '🛑 Stop Tracking' : '▶️ Start Tracking'}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-white shadow-lg p-4">
                        <div className="flex items-start p-4 bg-red-50 border-l-4 border-red-500 rounded">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Location Info */}
                {location && (
                    <div className="bg-white shadow-lg p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
                            Current Location
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 font-medium">Latitude:</span>
                                <span className="font-mono text-gray-800">{location.latitude.toFixed(6)}°</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 font-medium">Longitude:</span>
                                <span className="font-mono text-gray-800">{location.longitude.toFixed(6)}°</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 font-medium">Accuracy:</span>
                                <span className="text-gray-800">
                                    {location.accuracy < 20 ? '🟢' : location.accuracy < 50 ? '🟡' : '🔴'}
                                    {' '}{location.accuracy.toFixed(0)} meters
                                </span>
                            </div>

                            {location.speed !== null && location.speed !== undefined && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium">Speed:</span>
                                    <span className="text-gray-800">
                                        {(location.speed * 3.6).toFixed(1)} km/h
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 font-medium">Last Update:</span>
                                <span className="text-gray-800">
                                    {new Date(location.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            {lastUpdateTime && (
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                    <span className="text-green-700 font-medium">Sent to Server:</span>
                                    <span className="text-green-800 text-sm">
                                        {lastUpdateTime.toLocaleTimeString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Google Maps Link */}
                        <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block w-full text-center py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            📍 View on Google Maps
                        </a>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-white rounded-b-2xl shadow-lg p-6">
                    <h4 className="font-bold text-gray-800 mb-3">📱 Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Make sure GPS is enabled on your device</li>
                        <li>Click "Allow" when asked for location permission</li>
                        <li>Tap the "Start Tracking" button above</li>
                        <li>Keep this page open while driving</li>
                        <li>Your location will update automatically</li>
                        <li>Admin can see your location in real-time</li>
                    </ol>

                    <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> Location tracking works on any network. You don't need to be connected to the same WiFi as the office!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

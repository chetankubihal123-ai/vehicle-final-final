import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { MapPin, X, Navigation } from 'lucide-react';

export default function DriverLocationService() {
    const [isTracking, setIsTracking] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [updateCount, setUpdateCount] = useState(0);

    // Fetch assigned vehicle ID if missing
    useEffect(() => {
        const fetchAssignedVehicle = async () => {
            const vehicleId = localStorage.getItem('assignedVehicleId');
            const token = localStorage.getItem('token');

            if (!vehicleId && token) {
                try {
                    console.log('🔍 Fetching assigned vehicle ID...');
                    const response = await axios.get(`${API_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data.assignedVehicleId) {
                        console.log('✅ Found assigned vehicle:', response.data.assignedVehicleId);
                        localStorage.setItem('assignedVehicleId', response.data.assignedVehicleId);
                        // Clear any previous "No vehicle assigned" error
                        setError('');
                    } else {
                        console.warn('⚠️ No vehicle assigned to this driver');
                        setError('No vehicle assigned. Please contact admin.');
                    }
                } catch (err) {
                    console.error('❌ Error fetching user details:', err);
                }
            }
        };

        fetchAssignedVehicle();
    }, []);

    const requestLocationPermission = () => {
        alert('Button clicked!');
        console.log('📍 Button clicked! Requesting location permission...');

        if (!navigator.geolocation) {
            const msg = 'Geolocation not supported by your browser';
            alert('ERROR: ' + msg);
            console.error('❌ Geolocation not supported');
            setError(msg);
            return;
        }

        alert('Geolocation is supported! Requesting permission...');
        console.log('✅ Setting permission requested state...');
        setPermissionRequested(true);

        // Request permission
        navigator.geolocation.getCurrentPosition(
            (position) => {
                alert('SUCCESS! Permission granted');
                console.log('✅ Permission granted!', position);
                setIsTracking(true);
                setError('');
            },
            (err) => {
                alert(`ERROR: ${err.message} (code: ${err.code})`);
                console.error('❌ Permission error:', err);
                setPermissionRequested(false);
                if (err.code === 1) {
                    setError('Location permission denied. Please enable location access in your browser settings.');
                } else if (err.code === 2) {
                    setError('Location unavailable. Make sure GPS is enabled.');
                } else {
                    setError(`Location error: ${err.message}`);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    useEffect(() => {
        if (!isTracking) return;

        console.log('🚗 Starting location tracking...');
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const vehicleId = localStorage.getItem('assignedVehicleId');
                const token = localStorage.getItem('token');

                if (!vehicleId || !token) {
                    setError('No vehicle assigned');
                    return;
                }

                try {
                    await axios.post(
                        `${API_URL}/api/vehicles/${vehicleId}/location`,
                        {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            timestamp: new Date(),
                            speed: position.coords.speed || 0
                        },
                        {
                            headers: { Authorization: `Bearer ${token}` }
                        }
                    );

                    setLastUpdate(new Date());
                    setUpdateCount(prev => prev + 1);
                    setError('');
                    console.log('📡 Location updated successfully');
                } catch (err: any) {
                    console.error('❌ Location update failed:', err);
                    setError(err.response?.data?.message || 'Update failed');
                }
            },
            (err) => {
                console.error('❌ Geolocation error:', err);
                setError(`Location error: ${err.message}`);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        return () => {
            console.log('🛑 Stopping location tracking');
            navigator.geolocation.clearWatch(watchId);
        };
    }, [isTracking]);

    // Debug: Always log when component renders
    console.log('DriverLocationService render:', { isTracking, permissionRequested, error });

    // Show button to enable tracking
    if (!isTracking && !permissionRequested) {
        return (
            <div
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-2xl"
                style={{ zIndex: 9999 }}
            >
                <div className="text-center">
                    <Navigation className="h-12 w-12 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold mb-2">Enable Location Tracking</h3>
                    <p className="text-sm text-blue-100 mb-4">
                        Share your live location to help track this vehicle
                    </p>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            requestLocationPermission();
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            requestLocationPermission();
                        }}
                        className="w-full bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all transform active:scale-95 shadow-lg"
                        style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                    >
                        📍 Enable Location Tracking
                    </button>
                    <p className="text-xs text-blue-200 mt-3">
                        Your browser will ask for permission
                    </p>
                </div>
            </div>
        );
    }

    // Requesting permission
    if (permissionRequested && !isTracking && !error) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white p-4 rounded-lg shadow-lg animate-pulse" style={{ zIndex: 9999 }}>
                <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 animate-ping" />
                    <div className="flex-1">
                        <p className="font-semibold">Requesting permission...</p>
                        <p className="text-xs text-blue-200">Please allow location access when prompted</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-red-600 text-white p-4 rounded-lg shadow-lg" style={{ zIndex: 9999 }}>
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <p className="font-semibold mb-1">Location Tracking Error</p>
                        <p className="text-sm text-red-100">{error}</p>
                        <button
                            type="button"
                            onClick={requestLocationPermission}
                            className="mt-3 w-full bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition"
                        >
                            Try Again
                        </button>
                    </div>
                    <button type="button" onClick={() => setError('')} className="text-white hover:text-red-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    }

    // Tracking active
    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-green-600 text-white p-4 rounded-lg shadow-lg" style={{ zIndex: 9999 }}>
            <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 animate-pulse" />
                <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">
                        <span className="inline-block h-2 w-2 bg-green-300 rounded-full animate-pulse"></span>
                        Location Tracking Active
                    </p>
                    <p className="text-xs text-green-100">
                        Updates: {updateCount} • Last: {lastUpdate?.toLocaleTimeString() || 'Starting...'}
                    </p>
                </div>
            </div>
        </div>
    );
}

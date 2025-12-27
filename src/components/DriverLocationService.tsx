// src/components/DriverLocationService.tsx
import { useEffect, useState, useRef } from "react";
import { MapPin, X, Navigation } from "lucide-react";
import axios from "axios";
import { API_URL } from "../config";
import { socket } from "../socket";

type IntervalHandle = number | null;

export default function DriverLocationService() {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const gpsTimerRef = useRef<IntervalHandle>(null);
  const wakeLockRef = useRef<any>(null);

  // -------------------------------
  // 1. Fetch driver profile + vehicle
  // -------------------------------
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("[DRIVER] No token in localStorage");
          return;
        }

        const res = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("[DRIVER] loaded /auth/me:", res.data);

        // Save driver id and assigned vehicle for later use
        localStorage.setItem("userId", res.data.id);
        if (res.data.assignedVehicleId) {
          localStorage.setItem("assignedVehicleId", res.data.assignedVehicleId);
        } else {
          console.warn("[DRIVER] No assigned vehicle for this driver");
        }
      } catch (e) {
        console.error("[DRIVER] /auth/me error:", e);
        setError("Failed to load driver profile");
      }
    })();
  }, []);

  // -------------------------------
  // 2. Base socket connection
  // -------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[DRIVER] No token, not connecting socket");
      return;
    }

    // Attach auth token & connect once
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log("[DRIVER] socket connected:", socket.id);
      setIsSocketConnected(true);
      setError("");
    };
    const onDisconnect = () => {
      console.log("[DRIVER] socket disconnected");
      setIsSocketConnected(false);
    };
    const onConnectError = (err: any) => {
      console.error("[DRIVER] socket connect_error:", err.message);
      setIsSocketConnected(false);
      setError("Socket connection failed: " + err.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);

  // -------------------------------
  // 3. Optional wake-lock (screen on)
  // -------------------------------
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // -------------------------------
  // 3. Optional wake-lock (screen on)
  // -------------------------------
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator && (navigator as any).wakeLock?.request) {
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen"
        );
        console.log("[DRIVER] wake lock acquired");
        wakeLockRef.current.addEventListener("release", () => {
          console.log("[DRIVER] wake lock released");
        });
      } else {
        console.log("[DRIVER] wake lock not supported (ok)");
      }
    } catch (e) {
      console.warn("[DRIVER] wake lock error:", e);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      /* ignore */
    }
  };

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

  // -------------------------------
  // 4. Start tracking
  // -------------------------------
  const startTracking = async () => {
    const driverId = localStorage.getItem("userId");
    const vehicleId = localStorage.getItem("assignedVehicleId");
    const token = localStorage.getItem("token");

    console.log("[DRIVER] startTracking for:", {
      driverId,
      vehicleId,
      tokenExists: !!token,
    });

    if (!token) {
      setError("Not authenticated. Please login again.");
      return;
    }

    if (!vehicleId || !driverId) {
      setError("Driver or vehicle ID missing");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device");
      return;
    }

    setIsTracking(true);
    setError("");
    await requestWakeLock();

    // Use watchPosition for real-time updates
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        let { latitude, longitude, speed, accuracy } = pos.coords;

        // Check if socket is connected before sending
        if (!socket.connected) {
          console.warn("[DRIVER] Socket not connected, skipping location update");
          setError("Socket disconnected. Reconnecting...");
          socket.connect();
          return;
        }

        // --- FILTERING FOR ACCURACY & JITTER ---
        // 1. Ignore low accuracy points (if accuracy > 30 meters)
        if (accuracy > 30 && prevLocationRef.current !== null) {
          console.log("[DRIVER] Poor accuracy, skipping:", accuracy);
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
            if (currentLocation?.speed === 0 && dist < 1) {
              return;
            }
          }
        }

        // Build full payload
        const location = {
          lat: latitude,
          lng: longitude,
          speed: sentSpeed,
          accuracy: accuracy ?? null,
          timestamp: new Date().toISOString(),
        };

        const payload = {
          vehicleId,
          location,
        };

        console.log("[DRIVER] send_location =>", payload);
        socket.emit("send_location", payload);

        // Update state and refs
        prevLocationRef.current = { lat: latitude, lng: longitude };
        setCurrentLocation({ lat: latitude, lng: longitude, speed: sentSpeed });
        setLastUpdate(new Date());
        setUpdateCount((prev) => prev + 1);
        setError(""); // Clear any previous errors
      },
      (err) => {
        console.error("[DRIVER] GPS error:", err);
        setError(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Force fresh GPS data
      }
    );

    gpsTimerRef.current = id;
  };

  // Auto-start tracking when dependencies are ready
  useEffect(() => {
    const checkAndStart = () => {
      const driverId = localStorage.getItem("userId");
      const vehicleId = localStorage.getItem("assignedVehicleId");
      if (driverId && vehicleId && isSocketConnected && !isTracking) {
        startTracking();
      }
    };

    const timer = setTimeout(checkAndStart, 2000); // Give it a moment to stabilize
    return () => clearTimeout(timer);
  }, [isSocketConnected, isTracking]);

  // -------------------------------
  // 5. Stop tracking
  // -------------------------------
  const stopTracking = () => {
    console.log("[DRIVER] stopTracking");
    setIsTracking(false);

    if (gpsTimerRef.current !== null) {
      navigator.geolocation.clearWatch(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }

    releaseWakeLock();
  };

  // -------------------------------
  // 6. UI
  // -------------------------------
  if (!isTracking) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4">
          <Navigation className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">Enable Live Tracking</h3>
            <p className="text-xs text-blue-100 mb-3">
              Share your real-time location with your fleet owner.
            </p>
            {error && (
              <p className="text-xs bg-black/20 rounded-md px-2 py-1 mb-2">
                {error}
              </p>
            )}
            <button
              className="w-full bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-50"
              onClick={startTracking}
            >
              📍 Start Tracking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 ${isSocketConnected ? 'bg-green-600' : 'bg-yellow-600'
      } text-white p-4 rounded-2xl shadow-2xl`}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <MapPin className={`h-6 w-6 ${isSocketConnected ? 'animate-pulse' : ''}`} />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              Tracking Active {!isSocketConnected && '(Reconnecting...)'}
            </p>
            <p className="text-[11px]">
              Updates: {updateCount} • Last:{" "}
              {lastUpdate?.toLocaleTimeString() || "Starting..."}
            </p>
          </div>
          <button onClick={stopTracking}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Socket Status */}
        <div className="text-[11px] bg-black/20 rounded-md px-2 py-1">
          Socket: {isSocketConnected ? '✓ Connected' : '✗ Disconnected'}
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="text-[11px] bg-black/20 rounded-md px-2 py-1">
            📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-[11px] bg-red-500/50 rounded-md px-2 py-1">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

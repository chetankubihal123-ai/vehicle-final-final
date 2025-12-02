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

    // Interval every 2 seconds
    gpsTimerRef.current = window.setInterval(() => {
      // Check if socket is connected before sending
      if (!socket.connected) {
        console.warn("[DRIVER] Socket not connected, skipping location update");
        setError("Socket disconnected. Reconnecting...");
        socket.connect();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, speed, accuracy } = pos.coords;

          // Build full payload
          const location = {
            lat: latitude,
            lng: longitude,
            speed: speed ?? 0,
            accuracy: accuracy ?? null,
            timestamp: new Date().toISOString(),
          };

          const payload = {
            vehicleId,
            location,
          };

          console.log("[DRIVER] send_location =>", payload);
          socket.emit("send_location", payload);

          // Update state for UI display
          setCurrentLocation({ lat: latitude, lng: longitude });
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
          timeout: 15000,
          maximumAge: 1000,
        }
      );
    }, 2000);
  };

  // -------------------------------
  // 5. Stop tracking
  // -------------------------------
  const stopTracking = () => {
    console.log("[DRIVER] stopTracking");
    setIsTracking(false);

    if (gpsTimerRef.current !== null) {
      window.clearInterval(gpsTimerRef.current);
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

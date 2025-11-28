# 📱 Mobile Vehicle Tracking - Cross-Network Setup Guide

This guide explains how to track vehicles using mobile device GPS across different networks and locations.

## 🎯 What You Need

To enable live vehicle tracking from mobile devices (without same network/IP):

1. **Backend deployed to internet** (accessible from anywhere)
2. **Mobile-friendly tracking interface** (responsive web app)
3. **GPS location sharing** from driver's mobile device
4. **Real-time updates** via WebSockets (Socket.io)

---

## 📋 Prerequisites

- ✅ Backend deployed on Render (public URL)
- ✅ Frontend deployed on Vercel (public URL)
- ✅ Mobile device with GPS enabled
- ✅ Internet connection on mobile device

---

## 🚀 Implementation Steps

### Step 1: Deploy Backend to Render

Your backend MUST be accessible from the internet. Follow these steps:

1. **Go to [Render.com](https://render.com)**
2. **Create New Web Service**
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

4. **Add Environment Variables**:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://srkulkarni196974_db_user:passwordgotilla@cluster0.vkvkwrq.mongodb.net/vehicle_sampa?appName=Cluster0
   JWT_SECRET=c96dd3de0c1ca4f5ffb9939b7478e591
   EMAIL_USER=srkulkarni1969.74@gmail.com
   EMAIL_PASS=dpqe afvn aemt qngc
   NODE_ENV=production
   ```

5. **Deploy** and note your backend URL (e.g., `https://vehicle-backend-abc.onrender.com`)

---

### Step 2: Deploy Frontend to Vercel

1. **Go to [Vercel.com](https://vercel.com)**
2. **Import your repository**
3. **Configure**:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variable**:
   - `VITE_API_URL` = Your Render backend URL

5. **Deploy**

---

### Step 3: Update Backend for CORS

Update `backend/server.js` to allow mobile/web access from anywhere:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-vercel-url.vercel.app',
    '*' // Allow all origins (for testing, restrict in production)
  ],
  credentials: true
}));
```

---

## 📱 Mobile GPS Tracking - How It Works

### Architecture:

```
Driver's Phone (GPS) → Sends Location → Backend API → MongoDB
                                              ↓
                                    WebSocket Broadcast
                                              ↓
                              Admin Dashboard (Real-time Map)
```

### Location Flow:

1. **Driver opens app** on mobile browser (your Vercel URL)
2. **Browser requests GPS permission**
3. **GPS coordinates are captured** automatically
4. **Sent to backend** via API every X seconds
5. **Backend stores** in MongoDB and broadcasts via Socket.io
6. **Admin sees** live location on dashboard map

---

## 🔧 Implementation Code

### 1. Create Mobile Location Tracker Component

Create `src/components/MobileLocationTracker.tsx`:

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy: number;
}

export const MobileLocationTracker = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTracking) return;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date(),
          accuracy: position.coords.accuracy
        };

        setLocation(locationData);

        // Send to backend
        try {
          const token = localStorage.getItem('token');
          const vehicleId = localStorage.getItem('vehicleId'); // Set when driver logs in

          await axios.post(
            `${API_URL}/api/vehicles/${vehicleId}/location`,
            {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              timestamp: locationData.timestamp
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (err) {
          console.error('Error sending location:', err);
        }
      },
      (err) => {
        setError(`Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true, // Use GPS
        timeout: 5000,
        maximumAge: 0
      }
    );

    // Cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Vehicle Location Tracker</h2>
      
      <button
        onClick={() => setIsTracking(!isTracking)}
        className={`w-full py-3 px-6 rounded-lg font-semibold ${
          isTracking
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isTracking ? 'Stop Tracking' : 'Start Tracking'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {location && (
        <div className="mt-6 space-y-2">
          <h3 className="font-semibold">Current Location:</h3>
          <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
          <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
          <p><strong>Accuracy:</strong> {location.accuracy.toFixed(2)}m</p>
          <p><strong>Last Update:</strong> {new Date(location.timestamp).toLocaleTimeString()}</p>
          <div className={`inline-block px-3 py-1 rounded ${
            isTracking ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {isTracking ? '🟢 Tracking Active' : '⚫ Tracking Inactive'}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">📱 Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Allow location access when prompted</li>
          <li>Click "Start Tracking"</li>
          <li>Keep this page open in your browser</li>
          <li>Your location will be sent every few seconds</li>
          <li>Admin can see your location on the dashboard</li>
        </ol>
      </div>
    </div>
  );
};
```

### 2. Update Backend to Handle Location Updates

Add to `backend/routes/vehicleRoutes.js`:

```javascript
// Update vehicle location
router.post('/:id/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Update vehicle location
    vehicle.currentLocation = {
      latitude,
      longitude,
      timestamp: timestamp || new Date()
    };

    // Add to location history
    if (!vehicle.locationHistory) {
      vehicle.locationHistory = [];
    }
    
    vehicle.locationHistory.push({
      latitude,
      longitude,
      timestamp: timestamp || new Date()
    });

    // Keep only last 100 locations to save space
    if (vehicle.locationHistory.length > 100) {
      vehicle.locationHistory = vehicle.locationHistory.slice(-100);
    }

    await vehicle.save();

    // Broadcast to connected clients via Socket.io
    req.app.get('io').emit('location-update', {
      vehicleId: vehicle._id,
      latitude,
      longitude,
      timestamp
    });

    res.json({ 
      success: true, 
      message: 'Location updated',
      location: vehicle.currentLocation 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### 3. Update Vehicle Model

Add to `backend/models/Vehicle.js`:

```javascript
currentLocation: {
  latitude: Number,
  longitude: Number,
  timestamp: Date
},
locationHistory: [{
  latitude: Number,
  longitude: Number,
  timestamp: Date
}]
```

---

## 📱 How Drivers Use It

### Method 1: Mobile Web Browser (Easiest)

1. **Driver opens** your Vercel URL on their phone: `https://your-app.vercel.app`
2. **Logs in** with their driver credentials
3. **Goes to "Track Location"** page
4. **Clicks "Start Tracking"**
5. **Allows location access** when prompted
6. **Keeps browser open** in background (or foreground)

### Method 2: Install as PWA (Progressive Web App)

1. Open site in mobile browser
2. Click "Add to Home Screen"
3. App runs like a native app
4. Better background tracking

---

## 🗺️ How Admins View Live Location

The admin dashboard already has real-time tracking via Socket.io:

```typescript
// In your admin dashboard component
useEffect(() => {
  const socket = io(API_URL);

  socket.on('location-update', (data) => {
    // Update marker on map
    updateVehicleMarker(data.vehicleId, data.latitude, data.longitude);
  });

  return () => socket.disconnect();
}, []);
```

---

## 🔒 Security Considerations

### 1. Authentication
- Only logged-in drivers can send location
- Token-based authentication required

### 2. Authorization
- Drivers can only update their assigned vehicle
- Verify vehicle ownership in backend

### 3. Rate Limiting
- Limit location updates to once per 5-10 seconds
- Prevent spam/abuse

### 4. Battery Optimization
- Use appropriate update frequency (e.g., every 30 seconds)
- Allow drivers to pause tracking

---

## ⚡ Performance Tips

### 1. Location Update Frequency
```javascript
// Update every 30 seconds (not every second)
const UPDATE_INTERVAL = 30000; // 30 seconds

setInterval(() => {
  sendLocationToBackend();
}, UPDATE_INTERVAL);
```

### 2. Battery Saving
```javascript
navigator.geolocation.watchPosition(
  callback,
  errorCallback,
  {
    enableHighAccuracy: false, // Use network location (faster, less battery)
    maximumAge: 10000, // Use cached location up to 10s old
    timeout: 5000
  }
);
```

### 3. Background Tracking
For true background tracking, consider:
- **PWA with Service Workers** (limited on iOS)
- **Native mobile app** (React Native, Flutter)
- **Dedicated GPS tracker hardware** (for commercial use)

---

## 🧪 Testing

### Test Locally First:
1. Use ngrok to expose localhost:
   ```bash
   npx ngrok http 5000
   ```
2. Update frontend to use ngrok URL
3. Open on mobile browser
4. Test location tracking

### Test After Deployment:
1. Open Vercel URL on mobile
2. Enable location
3. Start tracking
4. Open admin dashboard on computer
5. Verify live location updates

---

## 📶 Network Requirements

### Minimum Requirements:
- **Mobile data** or **WiFi** connection
- **GPS enabled** on device
- **Location permission** granted to browser

### Data Usage:
- Very minimal (~1KB per location update)
- 30-second updates = ~2KB/minute = ~120KB/hour

---

## 🚨 Troubleshooting

### "Location access denied"
- Go to browser settings → Site permissions
- Enable location for your site

### "Location not updating"
- Check internet connection
- Verify backend is accessible
- Check browser console for errors

### "High battery drain"
- Reduce update frequency
- Use `enableHighAccuracy: false`
- Pause tracking when not needed

---

## 🎯 Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Add MobileLocationTracker component
4. ✅ Update backend API endpoints
5. ✅ Test on mobile device
6. ✅ Share Vercel URL with drivers

---

## 📱 Driver Instructions (Share this with your drivers)

**How to share your vehicle location:**

1. Open this link on your phone: `https://your-app.vercel.app`
2. Log in with your driver credentials
3. Go to "Track Location" or "Start Tracking" page
4. Click "Allow" when asked for location permission
5. Click "Start Tracking" button
6. Keep the page open while driving (you can switch to other apps)
7. Your location will automatically update every 30 seconds

**Important:**
- Make sure GPS is enabled on your phone
- Keep mobile data or WiFi connected
- The app works on any network, anywhere in the world!

---

Your vehicle tracking system will now work **across any network, from anywhere in the world!** 🌍

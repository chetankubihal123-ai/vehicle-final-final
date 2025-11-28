require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Middleware - Allow all origins for development to fix mobile connection issues
app.use(express.json());
app.use(cors({
    origin: true, // Allow any origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
  });
// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/uploads', express.static('uploads'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/location', require('./routes/locationRoutes'));

// Start Cron Jobs
require('./services/reminderService');

app.get('/', (req, res) => {
    res.send('Vehicle Management System API is running');
});

// Create HTTP Server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for Socket.io
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Models
const LiveLocation = require('./models/LiveLocation');
const RouteHistory = require('./models/RouteHistory');

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a specific vehicle room
    socket.on('join_vehicle', async (vehicleId) => {
        socket.join(vehicleId);
        console.log(`User ${socket.id} joined vehicle room: ${vehicleId}`);

        // Send last known location immediately
        try {
            const lastLocation = await LiveLocation.findOne({ vehicleId });
            if (lastLocation) {
                socket.emit('receive_location', {
                    vehicleId,
                    location: {
                        lat: lastLocation.lat,
                        lng: lastLocation.lng,
                        timestamp: lastLocation.timestamp,
                        speed: 0
                    }
                });
            }

            // Send full route history for today
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const history = await RouteHistory.findOne({
                vehicleId,
                createdAt: { $gte: startOfDay } // Get history for today
            });

            if (history && history.locations.length > 0) {
                const routePoints = history.locations.map(loc => ({
                    lat: loc.lat,
                    lng: loc.lng,
                    timestamp: loc.timestamp
                }));
                socket.emit('receive_route_history', routePoints);
            }

        } catch (err) {
            console.error('Error fetching vehicle data:', err);
        }
    });

    // Receive location update from driver
    socket.on('send_location', async (data) => {
        // Broadcast to everyone in the vehicle room (except sender)
        socket.to(data.vehicleId).emit('receive_location', data);
        console.log(`Location update for ${data.vehicleId}:`, data.location);

        // Save to LiveLocation (Current State)
        try {
            await LiveLocation.findOneAndUpdate(
                { vehicleId: data.vehicleId },
                {
                    vehicleId: data.vehicleId,
                    lat: data.location.lat,
                    lng: data.location.lng,
                    timestamp: data.location.timestamp
                },
                { upsert: true, new: true }
            );

            // Save to RouteHistory (Path)
            // Find today's route history or create new
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            await RouteHistory.findOneAndUpdate(
                {
                    vehicleId: data.vehicleId,
                    createdAt: { $gte: startOfDay }
                },
                {
                    $setOnInsert: { vehicleId: data.vehicleId },
                    $push: {
                        locations: {
                            lat: data.location.lat,
                            lng: data.location.lng,
                            timestamp: data.location.timestamp
                        }
                    }
                },
                { upsert: true, new: true }
            );

        } catch (err) {
            console.error('Error saving location:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

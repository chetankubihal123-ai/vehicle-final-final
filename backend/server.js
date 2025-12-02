// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
  origin: [
    "https://vehicle-frontend-tuhe.onrender.com",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
})

);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/uploads", express.static("uploads"));
app.use("/api/trips", require("./routes/tripRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/location", require("./routes/locationRoutes"));

// Start Cron Jobs
require("./services/reminderService");

app.get("/", (req, res) => {
  res.send("Vehicle Management System API is running");
});

// HTTP server + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Models
const LiveLocation = require("./models/LiveLocation");
const RouteHistory = require("./models/RouteHistory");

// Socket auth middleware
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = socket.handshake.auth?.token || tokenFromHeader;

    if (!token) {
      return next(new Error("Authentication error: no token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

// Socket.io Connection Handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id, "role:", socket.user?.role);

  // Viewer (admin/fleet_owner) joins vehicle room
  socket.on("join_vehicle", async (vehicleId) => {
    try {
      console.log("[SOCKET] join_vehicle:", {
        socket: socket.id,
        role: socket.user?.role,
        vehicleId,
      });

      if (!["fleet_owner", "admin"].includes(socket.user.role)) {
        console.warn(
          `Socket ${socket.id} blocked from join_vehicle (role: ${socket.user.role})`
        );
        return;
      }

      const roomId = String(vehicleId);
      socket.join(roomId);
      console.log(`User ${socket.id} joined vehicle room: ${roomId}`);

      // 1) Send last known location immediately
      const lastLocation = await LiveLocation.findOne({ vehicleId: vehicleId });
      if (lastLocation) {
        socket.emit("receive_location", {
          vehicleId,
          location: {
            lat: lastLocation.lat,
            lng: lastLocation.lng,
            timestamp: lastLocation.timestamp,
            speed: lastLocation.speed || 0,
          },
          driverId: lastLocation.driverId,
        });
      }

      // 2) Send today’s route history
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const history = await RouteHistory.findOne({
        vehicleId: vehicleId,
        createdAt: { $gte: startOfDay },
      });

      if (history && history.locations.length > 0) {
        const routePoints = history.locations.map((loc) => ({
          lat: loc.lat,
          lng: loc.lng,
          timestamp: loc.timestamp,
        }));
        socket.emit("receive_route_history", routePoints);
      }
    } catch (err) {
      console.error("Error in join_vehicle:", err);
    }
  });

  // Driver sends live location
  socket.on("send_location", async (data) => {
    try {
      if (socket.user.role !== "driver") {
        console.warn(
          `Socket ${socket.id} blocked from send_location (role: ${socket.user.role})`
        );
        return;
      }

      const driverId = socket.user.id;
      const { vehicleId, location } = data || {};

      console.log(`[DRIVER ${socket.id}] send_location received:`, {
        driverId,
        vehicleId,
        location,
      });

      if (!vehicleId || !location) {
        console.warn("[SOCKET] send_location missing fields:", data);
        return;
      }

      const { lat, lng, speed, timestamp } = location;

      // Strict validation of coordinates
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        console.warn(
          "[SOCKET] Ignoring send_location with invalid coords:",
          data
        );
        return;
      }

      const roomId = String(vehicleId);
      const ts = timestamp ? new Date(timestamp) : new Date();
      const spd = typeof speed === "number" ? speed : 0;

      // Ensure driver joined its own room
      socket.join(roomId);

      // Broadcast to all viewers of this vehicle
      const payload = {
        vehicleId,
        location: { lat, lng, timestamp: ts, speed: spd },
        driverId,
      };

      console.log(
        `[BROADCAST] Vehicle ${vehicleId} location update:`,
        { lat, lng, speed: spd, room: roomId, listeners: io.sockets.adapter.rooms.get(roomId)?.size || 0 }
      );

      io.to(roomId).emit("receive_location", payload);

      // Save to LiveLocation
      await LiveLocation.findOneAndUpdate(
        { vehicleId },
        {
          vehicleId,
          driverId,
          lat,
          lng,
          speed: spd,
          timestamp: ts,
        },
        { upsert: true, new: true }
      );

      // Save to RouteHistory for today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      await RouteHistory.findOneAndUpdate(
        {
          vehicleId,
          createdAt: { $gte: startOfDay },
        },
        {
          $setOnInsert: { vehicleId, driverId },
          $push: {
            locations: { lat, lng, timestamp: ts, speed: spd },
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Error in send_location:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


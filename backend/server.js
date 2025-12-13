// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

// -----------------------------
// MIDDLEWARE
// -----------------------------
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://vehicle-final-final-1.onrender.com", // frontend.
      "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -----------------------------
// SERVE UPLOADED FILES (IMPORTANT FOR RECEIPTS)
// -----------------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -----------------------------
// MONGO CONNECTION
// -----------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// -----------------------------
// ROUTES
// -----------------------------
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/trips", require("./routes/tripRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/location", require("./routes/locationRoutes"));

// Cron service
require("./services/reminderService");

app.get("/", (req, res) => {
  res.send("Vehicle Management System API is running");
});

// -----------------------------
// HTTP SERVER + SOCKET.IO
// -----------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://vehicle-final-final-1.onrender.com",
      "http://localhost:5173"
    ],
    credentials: true,
    methods: ["GET", "POST"],
  }
});

// -----------------------------
// SOCKET.IO AUTH MIDDLEWARE
// -----------------------------
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = socket.handshake.auth?.token || tokenFromHeader;
    if (!token) return next(new Error("No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication failed"));
  }
});

// -----------------------------
// SOCKET.IO HANLDERS
// -----------------------------
const LiveLocation = require("./models/LiveLocation");
const RouteHistory = require("./models/RouteHistory");

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "role:", socket.user?.role);

  socket.on("join_vehicle", async (vehicleId) => {
    try {
      if (!["fleet_owner", "admin"].includes(socket.user.role)) return;

      const roomId = String(vehicleId);
      socket.join(roomId);

      const lastLocation = await LiveLocation.findOne({ vehicleId });
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

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const history = await RouteHistory.findOne({
        vehicleId,
        createdAt: { $gte: startOfDay },
      });

      if (history) {
        const routePoints = history.locations.map((loc) => ({
          lat: loc.lat,
          lng: loc.lng,
          timestamp: loc.timestamp,
        }));
        socket.emit("receive_route_history", routePoints);
      }

    } catch (err) {
      console.error("join_vehicle error:", err);
    }
  });

  socket.on("send_location", async (data) => {
    try {
      if (socket.user.role !== "driver") return;

      const driverId = socket.user.id;
      const { vehicleId, location } = data || {};
      if (!vehicleId || !location) return;

      const { lat, lng, speed, timestamp } = location;

      const roomId = String(vehicleId);
      socket.join(roomId);

      const ts = timestamp ? new Date(timestamp) : new Date();
      const spd = typeof speed === "number" ? speed : 0;

      io.to(roomId).emit("receive_location", {
        vehicleId,
        location: { lat, lng, timestamp: ts, speed: spd },
        driverId,
      });

      await LiveLocation.findOneAndUpdate(
        { vehicleId },
        { vehicleId, driverId, lat, lng, speed: spd, timestamp: ts },
        { upsert: true, new: true }
      );

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      await RouteHistory.findOneAndUpdate(
        { vehicleId, createdAt: { $gte: startOfDay } },
        {
          $setOnInsert: { vehicleId, driverId },
          $push: { locations: { lat, lng, timestamp: ts, speed: spd } },
        },
        { upsert: true, new: true }
      );

    } catch (err) {
      console.error("send_location error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// -----------------------------
// START SERVER
// -----------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

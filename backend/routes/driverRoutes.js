// backend/routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  addDriver,
  updateDriver,
  getDrivers,
  assignVehicle,
  getMyVehicle,
  deleteDriver,
} = require("../controllers/driverController");

// Roles allowed to manage drivers
const OWNER_ROLES = ["admin", "fleet_owner"];

// Get all drivers for current owner/admin
router.get("/", auth(OWNER_ROLES), getDrivers);

// Add a new driver
// Frontend can call either POST /api/drivers or POST /api/drivers/add
router.post("/", auth(OWNER_ROLES), addDriver);
router.post("/add", auth(OWNER_ROLES), addDriver); // alias, just in case

// Update existing driver
router.put("/:id", auth(OWNER_ROLES), updateDriver);

// Assign vehicle to driver
router.post("/assign", auth(OWNER_ROLES), assignVehicle);

// Driver’s own vehicle info
router.get("/my-vehicle", auth(["driver"]), getMyVehicle);

// Delete a driver
router.delete("/:id", auth(OWNER_ROLES), deleteDriver);

module.exports = router;

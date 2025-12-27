const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function cleanup() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI not found in .env");
        }

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        const User = require("../models/User");
        const Driver = require("../models/Driver");
        const Vehicle = require("../models/Vehicle");

        const OWNER_EMAIL = "chetankubihal123@gmail.com";

        console.log(`Starting cleanup... (Preserving Owner: ${OWNER_EMAIL})`);

        // 1. Delete Drivers
        const driverResult = await Driver.deleteMany({});
        console.log(`Deleted ${driverResult.deletedCount} Driver profiles.`);

        // 2. Delete Users with role 'driver' 
        // AND any orphaned driver users that might not have a profile but occupy the email
        const userResult = await User.deleteMany({
            email: { $ne: OWNER_EMAIL },
            role: "driver"
        });
        console.log(`Deleted ${userResult.deletedCount} User accounts with role 'driver'.`);

        // 3. Reset Vehicle assignments
        const vehicleResult = await Vehicle.updateMany({}, { $unset: { currentDriver: "" } });
        console.log(`Reset currentDriver on ${vehicleResult.modifiedCount} vehicles.`);

        console.log("Cleanup completed successfully.");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

cleanup();

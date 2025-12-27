const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });
const mongoUri = process.env.MONGO_URI;

async function cleanup() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        // Using mongoose.connection.db for direct access to avoid model requirements
        const db = mongoose.connection.db;

        const OWNER_EMAIL = "chetankubihal123@gmail.com";
        const KEEP_EMAILS = [
            OWNER_EMAIL,
            "chetankubihal9916@gmail.com",
            "nirmalakubihal123@gmail.com",
            "sharatphatarpekar@gmail.com",
            "abhinagur05@gmail.com",
            "abhiahay2811@gmail.com",
            "tejassutrave@gmail.com"
        ];

        console.log(`Starting cleanup... Preserving: ${KEEP_EMAILS.length} accounts.`);

        // 1. Get all users to find which ones to delete
        const usersCollection = db.collection("users");
        const driversCollection = db.collection("drivers");
        const vehiclesCollection = db.collection("vehicles");

        const allUsers = await usersCollection.find({}).toArray();
        const usersToDelete = allUsers.filter(u => !KEEP_EMAILS.includes(u.email));
        const userIdsToDelete = usersToDelete.map(u => u._id);

        console.log(`Identified ${userIdsToDelete.length} users to delete.`);

        // 2. Delete Users
        if (userIdsToDelete.length > 0) {
            const userDelResult = await usersCollection.deleteMany({ _id: { $in: userIdsToDelete } });
            console.log(`Deleted ${userDelResult.deletedCount} User accounts.`);
        }

        // 3. Delete Drivers associated with deleted users
        // OR just delete all drivers NOT in the KEEP list if we can link them
        // Actually, let's look for drivers whose userId is NOT in the active user list
        const activeUsers = allUsers.filter(u => KEEP_EMAILS.includes(u.email));
        const activeUserIds = activeUsers.map(u => u._id.toString());

        const allDrivers = await driversCollection.find({}).toArray();
        const driversToDelete = allDrivers.filter(d => !activeUserIds.includes(d.userId.toString()));
        const driverIdsToDelete = driversToDelete.map(d => d._id);

        console.log(`Identified ${driverIdsToDelete.length} drivers to delete.`);

        if (driverIdsToDelete.length > 0) {
            const driverDelResult = await driversCollection.deleteMany({ _id: { $in: driverIdsToDelete } });
            console.log(`Deleted ${driverDelResult.deletedCount} Driver profiles.`);
        }

        // 4. Reset vehicle assignments for deleted drivers
        const vehicleResult = await vehiclesCollection.updateMany({}, { $unset: { currentDriver: "" } });
        console.log(`Reset currentDriver on ${vehicleResult.modifiedCount} vehicles.`);

        console.log("Cleanup completed successfully.");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

cleanup();

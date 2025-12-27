const mongoose = require("mongoose");
require("dotenv").config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const User = require("./models/User");
        const Driver = require("./models/Driver");

        const users = await User.find({});
        const drivers = await Driver.find({});

        console.log(`Total Users: ${users.length}`);
        console.log(`Total Drivers: ${drivers.length}`);

        console.log("\n--- Users ---");
        users.forEach(u => console.log(`- ${u.email} (${u.role}) ID: ${u._id}`));

        console.log("\n--- Drivers ---");
        drivers.forEach(d => console.log(`- License: ${d.licenseNumber} UserID: ${d.userId} ID: ${d._id}`));

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

checkData();

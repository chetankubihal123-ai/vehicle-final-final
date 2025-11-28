require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const count = await Vehicle.countDocuments();
        console.log(`Total Vehicles: ${count}`);
        if (count > 0) {
            const vehicles = await Vehicle.find({});
            console.log(vehicles);
        }
        mongoose.connection.close();
    })
    .catch(err => console.error(err));

require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB...');

        try {
            // Clear Users
            await mongoose.connection.collection('users').deleteMany({});
            console.log('✅ All users cleared.');

            // Clear Trips (optional, but good for fresh start)
            await mongoose.connection.collection('trips').deleteMany({});
            console.log('✅ All trips cleared.');

            // Clear OTPs/Temporary data if any
            // await mongoose.connection.collection('otps').deleteMany({}); 

        } catch (error) {
            console.error('Error clearing data:', error);
        } finally {
            mongoose.connection.close();
            console.log('Database connection closed.');
        }
    })
    .catch(err => console.error('Connection Error:', err));

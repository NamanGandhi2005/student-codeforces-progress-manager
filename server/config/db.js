// server/config/db.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' }); // Adjust path if .env is in project root

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // useNewUrlParser and useUnifiedTopology are no longer needed
            // for Mongoose 6+ and will cause errors if used.
            // useCreateIndex is also no longer supported.
            // Mongoose 6+ defaults to a robust set of options.
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB; 
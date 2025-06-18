// server/server.js
require('dotenv').config({ path: '../.env' }); // Load .env from project root for MONGO_URI, PORT etc.
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Required for graceful shutdown
const cookieParser = require('cookie-parser'); // +++ ADDED: Import cookie-parser

const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes'); // +++ ADDED: Import authRoutes
const {
    loadCronSettings,
    startOrRestartCronJobs
} = require('./cron/syncScheduler');

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// +++ MODIFIED: Updated CORS configuration for credentials
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000', // Allow your frontend origin
    credentials: true // Allow cookies to be sent from/to frontend
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // +++ ADDED: Use cookie-parser middleware

// --- Log requests for debugging (optional) ---
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log('Body:', req.body);
    }
    next();
});

// API Routes
app.use('/api/auth', authRoutes);         // +++ ADDED: Mount authRoutes (preferably before other API routes)
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

// --- MODIFIED: Improved Global Error Handling Middleware (example) ---
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err.name, err.message); // Log name for better context
    // Consider sending a more generic message in production
    let statusCode = err.statusCode || err.status || 500; // Prefer err.statusCode if available
    let message = err.message || 'An unexpected server error occurred.';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }
    // Mongoose duplicate key
    if (err.code === 11000) { // Check for code 11000 for duplicate key
        statusCode = 400; // Bad Request
        // Try to make a more user-friendly message for duplicates
        const field = Object.keys(err.keyValue || {})[0]; // Use err.keyValue
        if (field) {
            message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
        } else {
            message = "A record with this unique key already exists.";
        }
    }
    // JWT Errors (can be handled here or in protect middleware)
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session has expired. Please log in again.';
    }


    res.status(statusCode).json({
        success: false,
        message: message,
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});

// --- Handle 404 for routes not found ---
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: `Not Found - ${req.originalUrl}` });
});


// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    if (process.env.NODE_ENV !== 'test') {
        console.log("[SERVER] Initializing cron system...");
        try {
            await loadCronSettings();
            await startOrRestartCronJobs();
            console.log("[SERVER] Cron system initialized and jobs started.");
        } catch (error) {
            console.error("[SERVER] CRITICAL: Failed to initialize cron system:", error);
        }
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise}, reason: ${err.name || 'Error'}: ${err.message}`);
    console.error(err.stack);
});

// Graceful shutdown on SIGTERM/SIGINT
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, () => {
    console.log(`[SERVER] Received ${signal}, attempting graceful shutdown...`);
    server.close((err) => {
      if (err) {
        console.error('[SERVER] Error during HTTP server close:', err);
        process.exit(1);
      }
      console.log('[SERVER] HTTP server closed.');
      mongoose.connection.close().then(() => {
        console.log('[SERVER] MongoDB connection closed.');
        process.exit(0);
      }).catch(dbErr => {
        console.error('[SERVER] Error closing MongoDB connection:', dbErr);
        process.exit(1);
      });
    });
    setTimeout(() => {
        console.error('[SERVER] Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
    }, 10000);
  });
});

module.exports = app;
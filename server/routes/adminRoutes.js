// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getCronSettings, updateCronSettings } = require('../controllers/adminController');

// --- IMPORT AUTH MIDDLEWARE ---
const { protect, authorize } = require('../middleware/authMiddleware');

// --- APPLY MIDDLEWARE TO ALL ROUTES IN THIS FILE ---
// All routes below this will first require a valid token (protect)
// and then require the user to have the 'admin' role (authorize('admin'))
router.use(protect);
router.use(authorize('admin'));

// Define routes
router.route('/cron-settings')
    .get(getCronSettings)
    .put(updateCronSettings);

// If you add more admin-specific routes in the future, place them here.
// They will automatically be protected by the router.use() calls above.

module.exports = router;
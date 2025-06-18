// server/controllers/adminController.js
const AdminSetting = require('../models/AdminSetting');
const { updateAndRestartCronJobs, getCurrentCronSettingsFromScheduler } = require('../cron/syncScheduler'); // We will modify/add these in syncScheduler

/**
 * @desc    Get current cron job settings
 * @route   GET /api/admin/cron-settings
 * @access  Admin (Protected - ideally)
 */
exports.getCronSettings = async (req, res) => {
    try {
        // Option 1: Get from the live scheduler (reflects what's actually running)
        // const settings = getCurrentCronSettingsFromScheduler();

        // Option 2: Get directly from DB (reflects saved persistent state)
        const dbSettings = await AdminSetting.getSettings(); // Ensures defaults are created if not present
        if (!dbSettings) { // Should not happen due to getSettings logic
            return res.status(404).json({ success: false, message: "Cron settings not found." });
        }

        res.json({
            success: true,
            data: {
                cronSchedule: dbSettings.cronSchedule,
                cronTimezone: dbSettings.cronTimezone,
                // You can add more info like what the scheduler is currently using
                // currentSchedulerSettings: getCurrentCronSettingsFromScheduler()
            }
        });
    } catch (error) {
        console.error("Error fetching cron settings:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve cron settings." });
    }
};

/**
 * @desc    Update cron job settings
 * @route   PUT /api/admin/cron-settings
 * @access  Admin (Protected - ideally)
 */
exports.updateCronSettings = async (req, res) => {
    const { cronSchedule, cronTimezone } = req.body;

    try {
        if (cronSchedule && !require('node-cron').validate(cronSchedule)) {
            return res.status(400).json({ success: false, message: "Invalid cron schedule pattern provided." });
        }
        if (cronTimezone) {
            try {
                new Intl.DateTimeFormat("en", { timeZone: cronTimezone }).format();
            } catch (e) {
                 return res.status(400).json({ success: false, message: "Invalid cron timezone string provided." });
            }
        }

        // This function will save to DB and then tell scheduler to use new settings
        const success = await updateAndRestartCronJobs({ cronSchedule, cronTimezone });

        if (success) {
            const updatedSettings = await AdminSetting.getSettings();
            res.json({
                success: true,
                message: "Cron settings updated and jobs should reflect new schedule.",
                data: updatedSettings // Send back the newly saved settings
            });
        } else {
            // This case might occur if scheduler fails to restart, though DB save might have succeeded
            res.status(500).json({ success: false, message: "Failed to fully update and restart cron jobs. Check server logs." });
        }
    } catch (error) {
        console.error("Error updating cron settings in controller:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: "An error occurred while updating cron settings." });
    }
};
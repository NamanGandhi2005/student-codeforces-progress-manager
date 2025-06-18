// server/cron/syncScheduler.js
const cron = require('node-cron');
// No longer need: require('dotenv').config({ path: '../../.env' }); // .env is loaded in server.js

const syncAllStudentsData = require('./tasks/syncStudentData');
const checkInactivityAndNotify = require('./tasks/inactivityNotifier');
const AdminSetting = require('../models/AdminSetting'); // Import AdminSetting model

let dataSyncJob;
let inactivityNotificationJob;

// These will be populated from DB or defaults during loadCronSettings
let currentCronSchedule;
let currentCronTimezone;

/**
 * Validates a cron pattern.
 * @param {string} pattern - The cron pattern string.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidCronPattern(pattern) {
    if (!pattern) return false;
    try {
        return cron.validate(pattern);
    } catch (e) {
        return false;
    }
}

/**
 * Loads cron settings from the database or uses defaults.
 * This function should be called once at server startup.
 */
async function loadCronSettings() {
    try {
        const settings = await AdminSetting.getSettings(); // Uses static method from AdminSetting model
        currentCronSchedule = settings.cronSchedule;
        currentCronTimezone = settings.cronTimezone;
        console.log(`[CRON_SCHEDULER] Loaded cron settings from DB: Schedule="${currentCronSchedule}", Timezone="${currentCronTimezone}"`);
    } catch (error) {
        console.error('[CRON_SCHEDULER] Critical error loading cron settings from DB. Falling back to hardcoded defaults:', error);
        // Fallback to hardcoded defaults if DB load fails catastrophically
        currentCronSchedule = '0 2 * * *'; // Default: 2 AM daily
        currentCronTimezone = 'Etc/UTC';   // Default: UTC
        console.log(`[CRON_SCHEDULER] Using fallback defaults: Schedule="${currentCronSchedule}", Timezone="${currentCronTimezone}"`);
    }
}

/**
 * Starts or Restarts the scheduled cron jobs using the current in-memory settings.
 * Ensures settings are loaded if they haven't been.
 * @returns {Promise<boolean>} True if jobs were successfully scheduled/rescheduled, false otherwise.
 */
async function startOrRestartCronJobs() {
    // Ensure settings are loaded before starting jobs if not already populated
    if (!currentCronSchedule || !currentCronTimezone) {
        console.warn('[CRON_SCHEDULER] Cron settings not pre-loaded. Loading now before starting jobs...');
        await loadCronSettings();
    }

    console.log(`[CRON_SCHEDULER] Attempting to schedule/reschedule cron jobs. Effective Settings - Schedule: "${currentCronSchedule}", Timezone: "${currentCronTimezone}"`);

    if (!isValidCronPattern(currentCronSchedule)) {
        console.error(`[CRON_SCHEDULER] Invalid cron schedule pattern: "${currentCronSchedule}". Cron jobs will NOT be scheduled.`);
        return false; // Indicate failure
    }

    // Stop existing jobs before rescheduling
    if (dataSyncJob) {
        dataSyncJob.stop();
        console.log('[CRON_SCHEDULER] Stopped existing data sync job.');
    }
    if (inactivityNotificationJob) {
        inactivityNotificationJob.stop();
        console.log('[CRON_SCHEDULER] Stopped existing inactivity notification job.');
    }

    try {
        // --- Schedule the daily data sync task ---
        dataSyncJob = cron.schedule(currentCronSchedule, async () => {
            const startTime = new Date();
            console.log(`[CRON_SCHEDULER_TASK] Triggering 'syncAllStudentsData' at ${startTime.toISOString()} (Schedule: ${currentCronSchedule}, TZ: ${currentCronTimezone})`);
            try {
                await syncAllStudentsData();
                console.log(`[CRON_SCHEDULER_TASK] 'syncAllStudentsData' completed. Duration: ${(new Date() - startTime) / 1000}s`);
            } catch (error) {
                console.error(`[CRON_SCHEDULER_TASK] Error in 'syncAllStudentsData': ${error.message}`, error);
            }
        }, {
            scheduled: true,
            timezone: currentCronTimezone,
        });
        console.log(`[CRON_SCHEDULER] 'syncAllStudentsData' job scheduled successfully.`);

        // --- Schedule the inactivity notification task ---
        inactivityNotificationJob = cron.schedule(currentCronSchedule, async () => {
            const startTime = new Date();
            console.log(`[CRON_SCHEDULER_TASK] Triggering 'checkInactivityAndNotify' at ${startTime.toISOString()} (Schedule: ${currentCronSchedule}, TZ: ${currentCronTimezone})`);
            // Optional: Add a slight delay if you want to ensure it runs strictly after the sync task
            // if both are on the exact same schedule and you want an order.
            // await new Promise(resolve => setTimeout(resolve, 1 * 60 * 1000)); // e.g., 1 min delay
            try {
                await checkInactivityAndNotify();
                console.log(`[CRON_SCHEDULER_TASK] 'checkInactivityAndNotify' completed. Duration: ${(new Date() - startTime) / 1000}s`);
            } catch (error) {
                console.error(`[CRON_SCHEDULER_TASK] Error in 'checkInactivityAndNotify': ${error.message}`, error);
            }
        }, {
            scheduled: true,
            timezone: currentCronTimezone,
        });
        console.log(`[CRON_SCHEDULER] 'checkInactivityAndNotify' job scheduled successfully.`);
        return true; // Indicate success
    } catch (error) {
        // This catch is for errors during cron.schedule() itself (e.g., bad timezone node-cron can't handle)
        console.error(`[CRON_SCHEDULER] CRITICAL: Failed to schedule cron jobs due to cron library error: ${error.message}.`);
        console.error(`[CRON_SCHEDULER] Attempted with Schedule: "${currentCronSchedule}", Timezone: "${currentCronTimezone}"`);
        // Consider alternative actions: attempt to revert to known good defaults, or log and stop.
        return false; // Indicate failure
    }
}

/**
 * Updates cron settings in the DB and then tells the scheduler to use these new settings.
 * @param {object} newSettings - Object containing { cronSchedule?, cronTimezone? }
 * @returns {Promise<boolean>} True if successful in saving and attempting to restart jobs, false otherwise.
 */
async function updateAndRestartCronJobs(newSettings) {
    try {
        console.log('[CRON_SCHEDULER] Update cron settings request received:', newSettings);

        // Prepare data for DB update, only include fields that are actually being changed
        const updatePayload = {};
        if (newSettings.cronSchedule !== undefined) {
            updatePayload.cronSchedule = newSettings.cronSchedule;
        }
        if (newSettings.cronTimezone !== undefined) {
            updatePayload.cronTimezone = newSettings.cronTimezone;
        }

        if (Object.keys(updatePayload).length === 0) {
            console.log('[CRON_SCHEDULER] No new settings provided for update.');
            return true; // No changes needed, consider it a success.
        }

        const updatedDbSettings = await AdminSetting.updateSettings(updatePayload); // Saves to DB & runs validators
        if (!updatedDbSettings) {
            console.error('[CRON_SCHEDULER] Failed to save new cron settings to DB. Aborting restart.');
            return false;
        }

        // Update in-memory current settings from what was actually saved/validated
        currentCronSchedule = updatedDbSettings.cronSchedule;
        currentCronTimezone = updatedDbSettings.cronTimezone;

        console.log(`[CRON_SCHEDULER] Cron settings saved to DB. New effective settings - Schedule: "${currentCronSchedule}", Timezone: "${currentCronTimezone}".`);
        console.log('[CRON_SCHEDULER] Proceeding to restart cron jobs with new settings...');
        return await startOrRestartCronJobs(); // Attempt to restart with new settings
    } catch (error) {
        // This catch is for errors during DB update, or if startOrRestartCronJobs itself throws an unhandled error
        console.error('[CRON_SCHEDULER] Error during the process of updating and restarting cron jobs:', error);
        // The error might be a ValidationError from Mongoose if invalid schedule/timezone was forced past controller checks
        return false;
    }
}

/**
 * Gets the currently effective cron settings (from memory, reflecting active schedule).
 */
function getCurrentCronSettingsFromScheduler() {
    // Ensure settings are loaded if this is called before initial load (e.g., by controller early in startup)
    if (!currentCronSchedule || !currentCronTimezone) {
         console.warn('[CRON_SCHEDULER] getCurrentCronSettingsFromScheduler called before settings fully initialized. May return undefined.');
    }
    return {
        cronSchedule: currentCronSchedule,
        cronTimezone: currentCronTimezone,
    };
}


module.exports = {
    loadCronSettings,                   // Called by server.js on startup
    startOrRestartCronJobs,             // Called by server.js on startup & by updateAndRestartCronJobs
    updateAndRestartCronJobs,           // Called by adminController
    getCurrentCronSettingsFromScheduler, // Called by adminController
};
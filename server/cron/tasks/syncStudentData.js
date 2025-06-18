// server/cron/tasks/syncStudentData.js
const Student = require('../../models/Student'); // Adjust path to your Student model
const { fetchAndSaveStudentCFData } = require('../../services/codeforcesAPIService'); // Adjust path

// Helper to introduce a delay between processing students, if needed, to be extremely cautious with API limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_STUDENT_SYNCS_MS = 500; // e.g., 0.5 second delay (CF API already has ~1s delay per call)

/**
 * Iterates through all students and fetches/updates their Codeforces data.
 * This function is intended to be called by a cron scheduler.
 */
async function syncAllStudentsData() {
    console.log(`[CRON_TASK_SYNC_ALL] Starting daily Codeforces data sync for all students at ${new Date().toISOString()}...`);
    let successCount = 0;
    let failureCount = 0;

    try {
        const students = await Student.find({}).select('codeforcesHandle name'); // Fetch only necessary fields

        if (students.length === 0) {
            console.log('[CRON_TASK_SYNC_ALL] No students found in the database to sync.');
            return;
        }

        console.log(`[CRON_TASK_SYNC_ALL] Found ${students.length} students to sync.`);

        for (const student of students) {
            try {
                console.log(`[CRON_TASK_SYNC_ALL] Syncing data for ${student.name} (Handle: ${student.codeforcesHandle})...`);
                await fetchAndSaveStudentCFData(student.codeforcesHandle);
                successCount++;
                // Optional: Add a small delay here if you are syncing a very large number of students
                // and want to be extra careful, though fetchAndSaveStudentCFData already has internal delays.
                // await delay(DELAY_BETWEEN_STUDENT_SYNCS_MS);
            } catch (error) {
                failureCount++;
                console.error(`[CRON_TASK_SYNC_ALL] Failed to sync data for ${student.codeforcesHandle} (Name: ${student.name}): ${error.message}`);
                // The error is already logged and student's syncStatus updated in fetchAndSaveStudentCFData
                // No need to re-throw here unless the cron scheduler needs to know about individual failures
            }
        }

        console.log(`[CRON_TASK_SYNC_ALL] Daily Codeforces data sync finished. Successful syncs: ${successCount}, Failed syncs: ${failureCount}.`);

    } catch (error) {
        // This would catch errors in fetching the list of students, for example
        console.error(`[CRON_TASK_SYNC_ALL] A critical error occurred during the sync all students process: ${error.message}`, error.stack);
    }
}

module.exports = syncAllStudentsData;
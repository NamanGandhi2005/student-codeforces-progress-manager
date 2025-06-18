// server/cron/tasks/inactivityNotifier.js
const Student = require('../../models/Student'); // Adjust path to your Student model
const { sendEmail } = require('../../config/mailer'); // Adjust path to your mailer config

const INACTIVITY_PERIOD_DAYS = 7; // Students are considered inactive if no submissions in this many days

/**
 * Checks for inactive students and sends them reminder emails.
 * This function is intended to be called by a cron scheduler.
 */
async function checkInactivityAndNotify() {
    console.log(`[CRON_TASK_INACTIVITY] Starting inactivity check for students at ${new Date().toISOString()}...`);
    let emailsSentCount = 0;
    let eligibleForReminderCount = 0;

    try {
        const inactivityThresholdTimestampSeconds = Math.floor(
            (Date.now() - INACTIVITY_PERIOD_DAYS * 24 * 60 * 60 * 1000) / 1000
        );

        // Find students who:
        // 1. Have email reminders enabled.
        // 2. Either have no last submission timestamp OR their last submission was before the inactivity threshold.
        const inactiveStudents = await Student.find({
            emailRemindersEnabled: true,
            $or: [
                { lastSubmissionTimestampSeconds: { $lt: inactivityThresholdTimestampSeconds } },
                { lastSubmissionTimestampSeconds: null } // Also consider those with no submissions recorded yet
            ]
        }).select('name email codeforcesHandle reminderSentCount'); // Select only needed fields

        if (inactiveStudents.length === 0) {
            console.log('[CRON_TASK_INACTIVITY] No students found meeting inactivity criteria.');
            return;
        }

        eligibleForReminderCount = inactiveStudents.length;
        console.log(`[CRON_TASK_INACTIVITY] Found ${eligibleForReminderCount} students eligible for an inactivity reminder.`);

        for (const student of inactiveStudents) {
            console.log(`[CRON_TASK_INACTIVITY] Processing inactive student: ${student.name} (Handle: ${student.codeforcesHandle}).`);

            const emailSubject = `Friendly Reminder: Time to jump back into Codeforces!`;
            const emailHtmlBody = `
                <p>Hi ${student.name},</p>
                <p>We noticed you haven't made any submissions on Codeforces (handle: <strong>${student.codeforcesHandle}</strong>) in the last ${INACTIVITY_PERIOD_DAYS} days.</p>
                <p>Consistent practice is key to improvement. Why not try solving a problem today?</p>
                <p>Visit <a href="https://codeforces.com/problemset">Codeforces Problemset</a> to find your next challenge!</p>
                <p>Best regards,<br/>The Student Progress Management System</p>
            `;

            try {
                const emailSentSuccessfully = await sendEmail({
                    to: student.email,
                    subject: emailSubject,
                    htmlBody: emailHtmlBody,
                });

                if (emailSentSuccessfully) {
                    student.reminderSentCount = (student.reminderSentCount || 0) + 1;
                    await student.save(); // Save the updated reminder count
                    emailsSentCount++;
                    console.log(`[CRON_TASK_INACTIVITY] Inactivity email sent to ${student.name} (${student.email}). New reminder count: ${student.reminderSentCount}.`);
                } else {
                    console.error(`[CRON_TASK_INACTIVITY] Failed to send inactivity email to ${student.name} (${student.email}). Check mailer logs.`);
                }
            } catch (emailError) {
                console.error(`[CRON_TASK_INACTIVITY] Error during email sending or DB update for ${student.name}: ${emailError.message}`);
            }
        }

        console.log(`[CRON_TASK_INACTIVITY] Inactivity check finished. Emails sent: ${emailsSentCount} out of ${eligibleForReminderCount} eligible students.`);

    } catch (error) {
        console.error(`[CRON_TASK_INACTIVITY] A critical error occurred during the inactivity check process: ${error.message}`, error.stack);
    }
}

module.exports = checkInactivityAndNotify;
// server/models/AdminSetting.js
const mongoose = require('mongoose');
const cron = require('node-cron'); // For validation

const DEFAULT_CRON_SCHEDULE = '0 2 * * *'; // 2 AM daily
const DEFAULT_CRON_TIMEZONE = 'Etc/UTC';

const AdminSettingSchema = new mongoose.Schema({
    // Using a fixed key to ensure we only have one document for these global settings.
    // This simplifies querying: always find by this key.
    configKey: {
        type: String,
        unique: true,
        required: true,
        default: 'globalAppSettings', // A fixed key for the single settings document
    },
    cronSchedule: {
        type: String,
        default: DEFAULT_CRON_SCHEDULE,
        validate: {
            validator: function(v) {
                return cron.validate(v);
            },
            message: props => `${props.value} is not a valid cron schedule pattern!`
        }
    },
    cronTimezone: {
        type: String,
        default: DEFAULT_CRON_TIMEZONE,
        // Basic timezone validation could be added, or rely on node-cron's handling.
        // For robust validation, consider a library like 'moment-timezone'.
        validate: {
            validator: function(v) {
                try {
                    // Test if Intl.DateTimeFormat supports the timezone
                    // This is a basic check; node-cron might have its own list.
                    new Intl.DateTimeFormat("en", { timeZone: v }).format();
                    return true;
                } catch (e) {
                    return false;
                }
            },
            message: props => `${props.value} is not a recognized timezone string!`
        }
    }
    // You can add other global application settings here in the future
}, { timestamps: true });

// Ensure a default settings document exists
AdminSettingSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ configKey: 'globalAppSettings' });
    if (!settings) {
        console.log('[AdminSetting] No settings found, creating default settings document...');
        settings = await this.create({
            configKey: 'globalAppSettings',
            cronSchedule: DEFAULT_CRON_SCHEDULE,
            cronTimezone: DEFAULT_CRON_TIMEZONE,
        });
        console.log('[AdminSetting] Default settings document created.');
    }
    return settings;
};

AdminSettingSchema.statics.updateSettings = async function(newSettings) {
    const { cronSchedule, cronTimezone } = newSettings;
    const updateData = {};
    if (cronSchedule) updateData.cronSchedule = cronSchedule;
    if (cronTimezone) updateData.cronTimezone = cronTimezone;

    return await this.findOneAndUpdate(
        { configKey: 'globalAppSettings' },
        { $set: updateData },
        { new: true, upsert: true, runValidators: true } // upsert ensures it's created if not found
    );
};


module.exports = mongoose.model('AdminSetting', AdminSettingSchema);
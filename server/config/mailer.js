// server/config/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../../.env' }); // Adjust path if .env is in project root

let transporter;

try {
    // Basic validation for essential email environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('[MAILER_CONFIG] EMAIL_USER or EMAIL_PASS not set in .env. Email functionality will be disabled.');
        // You could throw an error here if email is absolutely critical for app startup
        // throw new Error('Email credentials (EMAIL_USER, EMAIL_PASS) are required.');
    } else {
        const mailConfig = {
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10),
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports (STARTTLS)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Optional: Add TLS options if needed for self-signed certs etc.
            // tls: {
            //     rejectUnauthorized: false // Use with caution for development/testing only
            // }
        };

        // If EMAIL_SERVICE is defined (e.g., 'gmail'), nodemailer can infer host/port/secure for known services
        if (process.env.EMAIL_SERVICE) {
            mailConfig.service = process.env.EMAIL_SERVICE;
            // For known services, host/port/secure are often not needed explicitly
            // delete mailConfig.host;
            // delete mailConfig.port;
            // delete mailConfig.secure;
        } else if (!process.env.EMAIL_HOST) {
             console.warn('[MAILER_CONFIG] EMAIL_HOST not set and no EMAIL_SERVICE specified. Email functionality might be impaired.');
        }


        transporter = nodemailer.createTransport(mailConfig);

        // Verify connection configuration (optional, but good for diagnostics)
        transporter.verify(function (error, success) {
            if (error) {
                console.error('[MAILER_CONFIG] Error verifying email transporter:', error);
            } else {
                console.log('[MAILER_CONFIG] Email transporter is configured and ready to send emails.');
            }
        });
    }
} catch (error) {
    console.error('[MAILER_CONFIG] Failed to initialize email transporter:', error);
    // Transporter will remain undefined, and attempts to use it will fail.
}


/**
 * Sends an email.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Subject of the email.
 * @param {string} htmlBody - HTML content of the email.
 * @param {string} textBody - Plain text content of the email (optional, for clients that don't support HTML).
 * @returns {Promise<boolean>} True if email was sent successfully, false otherwise.
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
    if (!transporter) {
        console.error('Email transporter is not initialized. Cannot send email.');
        return false;
    }
    if (!to || !subject || !htmlBody) {
        console.error('Missing required parameters for sending email (to, subject, htmlBody).');
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Student Progress System" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody || htmlBody.replace(/<[^>]*>?/gm, ''), // Basic text version from HTML
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        return false;
    }
}

module.exports = { sendEmail };
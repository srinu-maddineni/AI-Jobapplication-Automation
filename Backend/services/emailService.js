const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Sends an email to the specified recipient, attaching the resume if provided.
 * Falls back to logging the full email details to the console if SMTP settings are not configured.
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.text - Plain text email body
 * @param {Array<Object>} params.attachments - Array of attachment objects for nodemailer
 */
const sendEmail = async ({ to, subject, text, attachments = [], userSmtp = null }) => {
  const host = userSmtp?.host || process.env.SMTP_HOST;
  const port = userSmtp?.port || process.env.SMTP_PORT || 587;
  const user = userSmtp?.user || process.env.SMTP_USER;
  const pass = userSmtp?.pass || process.env.SMTP_PASS;
  const from = userSmtp?.from || process.env.SMTP_FROM || user || 'AI Job Application Automator <no-reply@example.com>';

  // Check if SMTP configurations are present
  if (!host || !user || !pass) {
    logger.warn('SMTP settings are missing. Email sending will be simulated.');
    
    console.log('\n==================================================');
    console.log('🤖 [SIMULATED EMAIL APPLICATION TO HR] 🤖');
    console.log(`From:        ${from}`);
    console.log(`To:          ${to}`);
    console.log(`Subject:     ${subject}`);
    console.log('--- Email Message Body ---');
    console.log(text);
    console.log('--------------------------');
    console.log(`Attachments: ${attachments.map(a => `${a.filename} (${a.path})`).join(', ') || 'None'}`);
    console.log('==================================================\n');

    return {
      success: true,
      simulated: true,
      message: 'Application email simulated successfully! Since SMTP is not configured in your .env, the full email details were printed to the server console.'
    };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587 or other ports
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to,
    subject,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully via SMTP', { messageId: info.messageId });
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
      message: 'Application email sent successfully to the HR contact!'
    };
  } catch (error) {
    logger.error('Failed to send email via SMTP', { error: error.message });
    throw new Error(`SMTP sending failed: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
};

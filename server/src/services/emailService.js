const nodemailer = require('nodemailer');

const isEmailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
  if (!isEmailConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const appName = () => process.env.APP_NAME || 'TaskFlow';
const appUrl = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

/**
 * Send welcome email when a user registers.
 * Does not throw — registration should still succeed if mail fails.
 */
const sendWelcomeEmail = async ({ name, email }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Email skipped: SMTP is not configured');
    return { sent: false, reason: 'not_configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const site = appUrl();

  try {
    await transporter.sendMail({
      from: `"${appName()}" <${from}>`,
      to: email,
      subject: `Welcome to ${appName()}!`,
      text: [
        `Hi ${name},`,
        '',
        `Your ${appName()} account was created successfully.`,
        `Email: ${email}`,
        '',
        `Open the app: ${site}`,
        '',
        'You can now create tasks, meetings, and get reminders.',
        '',
        `— The ${appName()} Team`,
      ].join('\n'),
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f242a;">
          <h1 style="color:#28735c;font-size:24px;margin:0 0 12px;">Welcome to ${appName()}</h1>
          <p style="font-size:16px;line-height:1.5;">Hi <strong>${name}</strong>,</p>
          <p style="font-size:16px;line-height:1.5;">
            Your account was created successfully with <strong>${email}</strong>.
          </p>
          <p style="margin:24px 0;">
            <a href="${site}" style="background:#28735c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:600;">
              Open ${appName()}
            </a>
          </p>
          <p style="font-size:14px;color:#626f7d;">You can create tasks, schedule meetings, and receive reminders.</p>
          <hr style="border:none;border-top:1px solid #e4e7ea;margin:24px 0;" />
          <p style="font-size:12px;color:#7d8a97;">If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    console.log(`Welcome email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    console.error('Welcome email failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  isEmailConfigured,
  sendWelcomeEmail,
};

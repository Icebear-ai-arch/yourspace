const nodemailer = require('nodemailer');

let transporter;

function getEmailConfiguration() {
  const port = Number(process.env.SMTP_PORT);
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASSWORD: password, SMTP_FROM: from } = process.env;
  if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return { host, port, user, password, from };
}

function isEmailConfigured() {
  return Boolean(getEmailConfiguration());
}

async function sendPasswordResetEmail(to, resetUrl) {
  const config = getEmailConfiguration();
  if (!config) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be configured.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });
  }

  await transporter.sendMail({
    from: config.from,
    to,
    subject: 'Reset your YourSpace password',
    text: [
      'A password reset was requested for your YourSpace account.',
      '',
      `Choose a new password using this one-time link: ${resetUrl}`,
      '',
      'This link expires in one hour. If you did not request a reset, you can ignore this email.',
    ].join('\n'),
  });
}

module.exports = { isEmailConfigured, sendPasswordResetEmail };

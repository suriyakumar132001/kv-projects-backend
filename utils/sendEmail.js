const nodemailer = require("nodemailer");

// Reuse one transporter across calls instead of creating a fresh SMTP
// connection every time — creating a new connection per email adds
// avoidable latency (and Gmail can rate-limit/slow down rapid new
// connections from the same account).
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `"KV Projects ERP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await getTransporter().sendMail(mailOptions);

    console.log("Email Sent:", info.messageId);

    return info;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = sendEmail;
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"KV Projects ERP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email Sent:", info.messageId);

    return info;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = sendEmail;
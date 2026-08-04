require("dotenv").config();

const sendEmail = require("./utils/sendEmail");

const test = async () => {
  try {
    await sendEmail({
      to: "kvprojects.erp@gmail.com",
      subject: "KV Projects ERP Test Email",
      html: `
        <h2>Email Working Successfully ✅</h2>

        <p>This email was sent from your ERP using Nodemailer.</p>
      `,
    });

    console.log("Email Sent Successfully");
  } catch (err) {
    console.log(err);
  }
};

test();
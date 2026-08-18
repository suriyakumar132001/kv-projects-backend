// =============================================
// KV Projects ERP
// Client Portal Admin Controller
// =============================================
//
// Owner/Admin-only actions for managing a client's
// access to their own portal. Not the same as
// clientController.js (which manages the CRM record
// itself) — this only touches portal-auth fields.
// =============================================

const crypto = require("crypto");

const Client = require("../models/Client");
const sendEmail = require("../utils/sendEmail");

const generateTempPassword = () => crypto.randomBytes(4).toString("hex"); // 8-char temp password

// =============================================
// Activate Client Portal Access
// =============================================
//
// Generates a fresh temporary password every time
// this is called — so it also doubles as "resend /
// reset credentials" if a client loses their password
// and can't use forgot-password themselves.
// =============================================

const activateClientPortal = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const tempPassword = generateTempPassword();

    // TEMP — for local testing only, remove once you no longer
    // need to verify portal logins without checking real inboxes.
    

    client.password = tempPassword; // hashed by the pre-save hook
    client.portalActive = true;

    await client.save();

    let emailQueued = false;

    try {
      await sendEmail({
        to: client.email,
        subject: "Your KV Projects client portal access is ready",
        html: `
          <h2>KV Projects ERP — Client Portal</h2>

          <p>Hi ${client.clientName},</p>

          <p>You now have access to track your project's progress, invoices, and payments online.</p>

          <p>Login with:</p>
          <p>
            Email: <b>${client.email}</b><br>
            Temporary Password: <b>${tempPassword}</b>
          </p>

          <p>For security, please log in and change your password as soon as possible.</p>

          <br>
          <p>Thank you.</p>
        `,
      });

      emailQueued = true;
    } catch (emailError) {
      // Same as the staff flow — a failed email doesn't block the
      // account from being activated, just logs it. Owner/Admin can
      // call this endpoint again to resend.
      console.error(
        "Client portal welcome email failed to send:",
        emailError.message,
      );
    }

    res.status(200).json({
      success: true,
      message: "Client portal access activated.",
      emailQueued,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Deactivate Client Portal Access
// =============================================

const deactivateClientPortal = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    client.portalActive = false;

    await client.save();

    res.status(200).json({
      success: true,
      message: "Client portal access disabled.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  activateClientPortal,
  deactivateClientPortal,
};

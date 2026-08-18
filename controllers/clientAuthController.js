// =============================================
// KV Projects ERP
// Client Portal Authentication Controller
// =============================================

const crypto = require("crypto");

const Client = require("../models/Client");
const generateClientToken = require("../utils/generateClientToken");
const sendEmail = require("../utils/sendEmail");

// =============================================
// Client Login
// =============================================

const clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    const client = await Client.findOne({ email });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "No account found for that email.",
      });
    }

    if (!client.portalActive || !client.password) {
      return res.status(403).json({
        success: false,
        message:
          "Portal access has not been set up for this account yet. Contact your project manager.",
      });
    }

    const isMatch = await client.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    client.lastPortalLogin = new Date();
    await client.save();

    const token = generateClientToken(client._id);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,

      client: {
        id: client._id,
        clientName: client.clientName,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
      },
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
// Forgot Password
// =============================================

const clientForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email",
      });
    }

    const client = await Client.findOne({ email });

    const genericResponse = {
      success: true,
      message:
        "If a client portal account exists for that email, a password reset link has been sent.",
    };

    // Same "always respond the same way" principle as the staff
    // flow — don't let this endpoint be used to probe which
    // emails have portal access.
    if (!client || !client.portalActive) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    client.resetPasswordToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    client.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await client.save();

    const resetUrl = `${
      process.env.CLIENT_PORTAL_URL || "http://localhost:5173/portal"
    }/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: client.email,
        subject: "Reset your KV Projects client portal password",
        html: `
          <h2>KV Projects ERP — Client Portal</h2>

          <p>Hi ${client.clientName},</p>

          <p>We received a request to reset your client portal password. Click the link below to choose a new one. This link expires in 30 minutes.</p>

          <p><a href="${resetUrl}">${resetUrl}</a></p>

          <p>If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>

          <br>
          <p>Thank you.</p>
        `,
      });
    } catch (emailError) {
      client.resetPasswordToken = undefined;
      client.resetPasswordExpire = undefined;
      await client.save();

      console.error(
        "Client password reset email failed to send:",
        emailError.message,
      );

      return res.status(500).json({
        success: false,
        message: "Could not send reset email. Please try again later.",
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Reset Password
// =============================================

const clientResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const client = await Client.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!client) {
      return res.status(400).json({
        success: false,
        message:
          "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    client.password = password;
    client.resetPasswordToken = undefined;
    client.resetPasswordExpire = undefined;

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  clientLogin,
  clientForgotPassword,
  clientResetPassword,
};

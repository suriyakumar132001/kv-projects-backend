// =========================================
// KV Projects ERP
// Client Portal Authentication Middleware
// =========================================

const jwt = require("jsonwebtoken");
const Client = require("../models/Client");

const protectClient = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. No Token Provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ---------------------------------------------
    // Reject anything that isn't explicitly a client
    // token. A staff (User) login never carries this
    // claim, so this is what keeps the two auth
    // domains from ever crossing over.
    // ---------------------------------------------

    if (decoded.type !== "client") {
      return res.status(403).json({
        success: false,
        message: "This login is not valid for the client portal.",
      });
    }

    const client = await Client.findById(decoded.id).select(
      "-password -resetPasswordToken -resetPasswordExpire",
    );

    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Client account not found.",
      });
    }

    // ---------------------------------------------
    // Re-check portalActive on every request, not just
    // at login time — if an Owner/Admin revokes access
    // mid-session, an already-issued token stops working
    // on the very next request instead of staying valid
    // until it expires.
    // ---------------------------------------------

    if (!client.portalActive) {
      return res.status(403).json({
        success: false,
        message:
          "Portal access has been disabled for this account. Contact your project manager.",
      });
    }

    req.client = client;

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
    });
  }
};

module.exports = protectClient;

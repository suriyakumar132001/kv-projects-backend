// =========================================
// KV Projects ERP
// Authentication Middleware
// =========================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT Token
const protect = async (req, res, next) => {
  try {
    let token;

    // Read Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Token Missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. No Token Provided.",
      });
    }

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get User
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User Not Found",
      });
    }

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
    });
  }
};

// Optional Auth — attaches req.user if a valid token is present,
// but does NOT block the request when no token is provided.
// Used on routes like /auth/register which must stay reachable for the
// very first "bootstrap" owner account, but otherwise require an
// authenticated owner/admin.
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (error) {
    // Invalid/expired token — treat as unauthenticated rather than erroring,
    // the controller decides what to do with req.user === null.
    req.user = null;
    next();
  }
};

module.exports = protect;
module.exports.protect = protect;
module.exports.optionalAuth = optionalAuth;

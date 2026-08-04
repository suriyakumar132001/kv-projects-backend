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

module.exports = protect;
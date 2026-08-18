// =========================================
// KV Projects ERP
// Client Portal Token Generator
// =========================================
//
// Deliberately separate from utils/generateToken.js
// (used for staff/User login). The "type: client" claim
// is what protectClient checks for — a staff-issued
// token will never carry this, and a client-issued token
// will never satisfy the staff `protect` middleware since
// it looks up decoded.id in the User collection, not Client.
// =========================================

const jwt = require("jsonwebtoken");

const generateClientToken = (clientId) => {
  return jwt.sign(
    {
      id: clientId,
      type: "client",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.CLIENT_JWT_EXPIRE || "7d",
    },
  );
};

module.exports = generateClientToken;

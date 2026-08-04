// =============================================
// KV Projects ERP
// Generate JWT Token
// =============================================

const jwt = require("jsonwebtoken");

/**
 * Generate JWT Token
 * @param {String} userId
 * @param {String} role
 * @returns {String} JWT Token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

module.exports = generateToken;
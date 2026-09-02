const express = require("express");

const router = express.Router();

const {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { optionalAuth } = require("../middleware/authMiddleware");

// optionalAuth attaches req.user when a valid token is sent, but does not
// block the request otherwise — the controller enforces who is allowed to
// register new users (see authController.register for the rules).
router.post("/register", optionalAuth, register);

router.post("/login", login);
router.post("/google", googleLogin);

// Forgot Password — user submits their email, gets a reset link by email
router.post("/forgot-password", forgotPassword);

// Reset Password — user submits a new password along with the token
// from the emailed link
router.put("/reset-password/:token", resetPassword);

module.exports = router;
const express = require("express");

const router = express.Router();

const { register, login } = require("../controllers/authController");
const { optionalAuth } = require("../middleware/authMiddleware");

// optionalAuth attaches req.user when a valid token is sent, but does not
// block the request otherwise — the controller enforces who is allowed to
// register new users (see authController.register for the rules).
router.post("/register", optionalAuth, register);

router.post("/login", login);

module.exports = router;

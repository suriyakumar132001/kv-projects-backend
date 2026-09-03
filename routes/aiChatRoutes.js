const express = require("express");
const { ipKeyGenerator, rateLimit } = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");
const { chatWithAgent } = require("../controllers/aiChatController");

const router = express.Router();
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) =>
    req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please try again shortly." },
});

router.post("/", protect, aiChatLimiter, chatWithAgent);

module.exports = router;
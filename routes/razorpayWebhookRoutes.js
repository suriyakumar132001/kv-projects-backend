const express = require("express");

const { handleWebhook } = require("../controllers/razorpayController");

const router = express.Router();

router.post("/razorpay", handleWebhook);

module.exports = router;
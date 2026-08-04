const express = require("express");

const router = express.Router();

const { sendInvoiceEmail } = require("../controllers/emailController");

router.post("/send-invoice/:id", sendInvoiceEmail);

module.exports = router;
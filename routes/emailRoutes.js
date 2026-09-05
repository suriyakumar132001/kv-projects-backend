const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

const { sendInvoiceEmail } = require("../controllers/emailController");

router.post(
	"/send-invoice/:id",
	protect,
	authorize("owner", "admin", "accountant"),
	sendInvoiceEmail,
);

module.exports = router;
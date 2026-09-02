const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  generateInvoicePDF,
  generatePayslipPDF,
} = require("../controllers/pdfController");

router.get(
  "/invoice/:id",
  protect,
  authorize("owner", "admin", "hr"),
  generateInvoicePDF
);

router.get(
  "/payslip/:id",
  protect,
  generatePayslipPDF
);

module.exports = router;
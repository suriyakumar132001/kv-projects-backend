const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  updatePaymentStatus,
  deleteInvoice,
} = require("../controllers/invoiceController");

// =====================================
// Create Invoice
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createInvoice
);

// =====================================
// Get All Invoices
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getInvoices
);

// =====================================
// Get Single Invoice
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr"),
  getInvoice
);

// =====================================
// Update Invoice
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updateInvoice
);

// =====================================
// Update Payment Status
// =====================================

router.put(
  "/payment/:id",
  protect,
  authorize("owner", "admin"),
  updatePaymentStatus
);

// =====================================
// Delete Invoice
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteInvoice
);

module.exports = router;
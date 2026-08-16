const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const checkPermission = require("../middleware/checkPermission");

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
  authorize("owner", "admin", "accountant"),
  checkPermission("invoices", "create"),
  createInvoice,
);

// =====================================
// Get All Invoices
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getInvoices,
);

// =====================================
// Get Single Invoice
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getInvoice,
);

// =====================================
// Update Invoice
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("invoices", "edit"),
  updateInvoice,
);

// =====================================
// Update Payment Status
// =====================================

router.put(
  "/payment/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("invoices", "edit"),
  updatePaymentStatus,
);

// =====================================
// Delete Invoice — stays Owner-only,
// intentionally not opened up to Accountant.
// =====================================

router.delete("/:id", protect, authorize("owner"), deleteInvoice);

module.exports = router;

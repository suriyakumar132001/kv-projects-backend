const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const checkPermission = require("../middleware/checkPermission");

const {
  createQuotation,
  getQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
} = require("../controllers/quotationController");

// Create Quotation
router.post(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("quotations", "create"),
  createQuotation,
);

// Get All Quotations
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getQuotations,
);

// Get Single Quotation
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getQuotation,
);

// Update Quotation
router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("quotations", "edit"),
  updateQuotation,
);

// Update Status
router.put(
  "/status/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("quotations", "edit"),
  updateQuotationStatus,
);

// Delete Quotation — stays Owner-only,
// intentionally not opened up to Accountant.
router.delete("/:id", protect, authorize("owner"), deleteQuotation);

module.exports = router;

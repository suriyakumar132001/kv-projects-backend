const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

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
  authorize("owner", "admin"),
  createQuotation
);

// Get All Quotations
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getQuotations
);

// Get Single Quotation
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr"),
  getQuotation
);

// Update Quotation
router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updateQuotation
);

// Update Status
router.put(
  "/status/:id",
  protect,
  authorize("owner", "admin"),
  updateQuotationStatus
);

// Delete Quotation
router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteQuotation
);

module.exports = router;
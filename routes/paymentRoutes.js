const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

// =====================================
// Create Payment
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  createPayment,
);

// =====================================
// Get All Payments
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getPayments,
);

// =====================================
// Get Single Payment
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "accountant"),
  getPayment,
);

// =====================================
// Update Payment
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  updatePayment,
);

// =====================================
// Delete Payment — stays Owner-only,
// intentionally not opened up to Accountant.
// =====================================

router.delete("/:id", protect, authorize("owner"), deletePayment);

module.exports = router;

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
  authorize("owner", "admin"),
  createPayment
);

// =====================================
// Get All Payments
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getPayments
);

// =====================================
// Get Single Payment
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr"),
  getPayment
);

// =====================================
// Update Payment
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updatePayment
);

// =====================================
// Delete Payment
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deletePayment
);

module.exports = router;
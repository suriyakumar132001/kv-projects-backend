const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createPurchaseOrder,
  getPurchaseOrders,
  updatePOStatus,
} = require("../controllers/purchaseOrderController");

// Create Purchase Order
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createPurchaseOrder
);

// Get All Purchase Orders
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getPurchaseOrders
);

// Update Status
router.put(
  "/:id/status",
  protect,
  authorize("owner", "admin"),
  updatePOStatus
);

module.exports = router;
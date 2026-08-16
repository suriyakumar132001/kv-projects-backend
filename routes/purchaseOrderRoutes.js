const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createPurchaseOrder,
  getPurchaseOrders,
  getSinglePurchaseOrder,
  cancelPurchaseOrder,
} = require("../controllers/purchaseOrderController");

router.post("/", protect, authorize("owner", "admin"), createPurchaseOrder);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant", "siteengineer"),
  getPurchaseOrders,
);

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant", "siteengineer"),
  getSinglePurchaseOrder,
);

router.put(
  "/:id/cancel",
  protect,
  authorize("owner", "admin"),
  cancelPurchaseOrder,
);

module.exports = router;
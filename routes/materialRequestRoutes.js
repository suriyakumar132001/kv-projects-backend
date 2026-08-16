const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createMaterialRequest,
  getMaterialRequests,
  getSingleMaterialRequest,
  updateRequestStatus,
  convertToPurchaseOrder,
} = require("../controllers/materialRequestController");

router.post(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  createMaterialRequest,
);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getMaterialRequests,
);

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getSingleMaterialRequest,
);

router.put(
  "/:id/status",
  protect,
  authorize("owner", "admin"),
  updateRequestStatus,
);

router.post(
  "/:id/convert-to-po",
  protect,
  authorize("owner", "admin"),
  convertToPurchaseOrder,
);

module.exports = router;

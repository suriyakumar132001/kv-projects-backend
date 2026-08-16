const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getInventory,
  getLowStock,
} = require("../controllers/inventoryController");

router.get(
  "/low-stock",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getLowStock,
);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getInventory,
);

module.exports = router;

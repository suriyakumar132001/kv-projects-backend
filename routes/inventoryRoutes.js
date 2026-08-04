const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getInventory,
} = require("../controllers/inventoryController");

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getInventory
);

module.exports = router;
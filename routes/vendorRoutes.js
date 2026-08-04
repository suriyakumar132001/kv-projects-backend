const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createVendor,
  getVendors,
} = require("../controllers/vendorController");

// Owner & Admin create vendors
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createVendor
);

// View vendors
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getVendors
);

module.exports = router;
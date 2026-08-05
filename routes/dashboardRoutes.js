const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const authorize = require("../middleware/roleMiddleware");

const {
  ownerDashboard,
  adminDashboard,
  hrDashboard,
  siteEngineerDashboard,
} = require("../controllers/dashboardController");

// Owner Only

router.get(
  "/owner",

  protect,

  authorize("owner"),

  ownerDashboard,
);

// Admin Only

router.get(
  "/admin",

  protect,

  authorize("admin"),

  adminDashboard,
);

// HR Only

router.get(
  "/hr",

  protect,

  authorize("hr"),

  hrDashboard,
);

// Site Engineer Only

router.get(
  "/siteengineer",

  protect,

  authorize("siteengineer"),

  siteEngineerDashboard,
);

module.exports = router;

const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getDashboardSummary,
  getMonthlyRevenue,
  getMonthlyExpenses,
  getBudgetSummary,
  getInventorySummary,
} = require("../controllers/analyticsController");

// ==========================================
// Dashboard Summary
// ==========================================

router.get(
  "/dashboard",
  protect,
  authorize("owner", "admin", "hr"),
  getDashboardSummary
);

// ==========================================
// Monthly Revenue
// ==========================================

router.get(
  "/revenue",
  protect,
  authorize("owner", "admin"),
  getMonthlyRevenue
);

// ==========================================
// Monthly Expenses
// ==========================================

router.get(
  "/expenses",
  protect,
  authorize("owner", "admin"),
  getMonthlyExpenses
);

// ==========================================
// Budget Summary
// ==========================================

router.get(
  "/budget",
  protect,
  authorize("owner", "admin"),
  getBudgetSummary
);

// ==========================================
// Inventory Summary
// ==========================================

router.get(
  "/inventory",
  protect,
  authorize("owner", "admin", "hr"),
  getInventorySummary
);

module.exports = router;
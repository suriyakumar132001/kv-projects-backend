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
  getPurchaseOrderSummary,
  getTopVendors,
  getLowStockItems,
  getOverdueInvoices,
  getProjectStatusOverview,
} = require("../controllers/analyticsController");

// ==========================================
// Dashboard Summary
// ==========================================

router.get(
  "/dashboard",
  protect,
  authorize("owner", "admin", "hr"),
  getDashboardSummary,
);

// ==========================================
// Monthly Revenue
// ==========================================

router.get("/revenue", protect, authorize("owner", "admin"), getMonthlyRevenue);

// ==========================================
// Monthly Expenses
// ==========================================

router.get(
  "/expenses",
  protect,
  authorize("owner", "admin"),
  getMonthlyExpenses,
);

// ==========================================
// Budget Summary
// ==========================================

router.get("/budget", protect, authorize("owner", "admin"), getBudgetSummary);

// ==========================================
// Inventory Summary
// ==========================================

router.get(
  "/inventory",
  protect,
  authorize("owner", "admin", "hr"),
  getInventorySummary,
);

// ==========================================
// Purchase Order Summary  (Phase 6 — Advanced Dashboard)
// ==========================================

router.get(
  "/purchase-orders",
  protect,
  authorize("owner", "admin"),
  getPurchaseOrderSummary,
);

// ==========================================
// Top Vendors by Spend  (Phase 6 — Advanced Dashboard)
// ==========================================

router.get("/vendors/top", protect, authorize("owner", "admin"), getTopVendors);

// ==========================================
// Low Stock Inventory  (Phase 6 — Advanced Dashboard)
// Same role set as the existing /inventory summary route above.
// ==========================================

router.get(
  "/inventory/low-stock",
  protect,
  authorize("owner", "admin", "hr"),
  getLowStockItems,
);

// ==========================================
// Overdue Invoices  (Phase 6 — Advanced Dashboard)
// ==========================================

router.get(
  "/invoices/overdue",
  protect,
  authorize("owner", "admin"),
  getOverdueInvoices,
);

// ==========================================
// Project Status Overview  (Phase 6 — Advanced Dashboard)
// ==========================================

router.get(
  "/projects/status",
  protect,
  authorize("owner", "admin"),
  getProjectStatusOverview,
);

module.exports = router;

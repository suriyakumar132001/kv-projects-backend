// ===============================================
// KV Projects ERP
// Expense Routes
// ===============================================

const express = require("express");

const router = express.Router();

// ===============================================
// Middleware
// ===============================================

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// ===============================================
// Controllers
// ===============================================

const {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getProjectExpenses,
} = require("../controllers/expenseController");

// =================================================
// EXPENSE STATISTICS
// GET /api/expenses/stats
// =================================================

router.get(
  "/stats",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getExpenseStats,
);

// =================================================
// PROJECT EXPENSES
// GET /api/expenses/project/:projectId
// =================================================

router.get(
  "/project/:projectId",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getProjectExpenses,
);

// =================================================
// GET ALL EXPENSES
// GET /api/expenses
// =================================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getExpenses,
);

// =================================================
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// =================================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getExpense,
);

// =================================================
// CREATE EXPENSE
// POST /api/expenses
// =================================================

router.post(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer"),
  createExpense,
);

// =================================================
// UPDATE EXPENSE
// PUT /api/expenses/:id
// =================================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer"),
  updateExpense,
);

// =================================================
// DELETE EXPENSE
// DELETE /api/expenses/:id
// =================================================

router.delete("/:id", protect, authorize("owner", "admin"), deleteExpense);

// =================================================
// EXPORT
// =================================================

module.exports = router;

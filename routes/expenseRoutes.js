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
const checkPermission = require("../middleware/checkPermission");

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
  authorize("owner", "admin", "hr", "siteengineer", "accountant"),
  getExpenseStats,
);

// =================================================
// PROJECT EXPENSES
// GET /api/expenses/project/:projectId
// =================================================

router.get(
  "/project/:projectId",
  protect,
  authorize("owner", "admin", "hr", "siteengineer", "accountant"),
  getProjectExpenses,
);

// =================================================
// GET ALL EXPENSES
// GET /api/expenses
// =================================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer", "accountant"),
  getExpenses,
);

// =================================================
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// =================================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer", "accountant"),
  getExpense,
);

// =================================================
// CREATE EXPENSE
// POST /api/expenses
// =================================================

router.post(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer", "accountant"),
  checkPermission("expenses", "create"),
  createExpense,
);

// =================================================
// UPDATE EXPENSE
// PUT /api/expenses/:id
// =================================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer", "accountant"),
  checkPermission("expenses", "edit"),
  updateExpense,
);

// =================================================
// DELETE EXPENSE
// DELETE /api/expenses/:id
// =================================================

router.delete(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("expenses", "delete"),
  deleteExpense,
);

// =================================================
// EXPORT
// =================================================

module.exports = router;
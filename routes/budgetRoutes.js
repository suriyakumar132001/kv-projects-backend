const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
} = require("../controllers/budgetController");

// =====================================
// Create Budget
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createBudget
);

// =====================================
// Get All Budgets
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getBudgets
);

// =====================================
// Get Single Budget
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr"),
  getBudget
);

// =====================================
// Update Budget
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updateBudget
);

// =====================================
// Delete Budget
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteBudget
);

module.exports = router;
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createExpense,
  getExpenses,
} = require("../controllers/expenseController");

// Site Engineer creates expense
router.post(
  "/",
  protect,
  authorize("siteengineer"),
  createExpense
);

// View expenses
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getExpenses
);

module.exports = router;
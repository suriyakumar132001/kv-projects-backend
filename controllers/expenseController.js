const Expense = require("../models/Expense");

// Create Expense
const createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      siteEngineer: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Expense Added Successfully",
      expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Expenses
const getExpenses = async (req, res) => {
  try {
    let expenses;

    if (
      req.user.role === "owner" ||
      req.user.role === "admin" ||
      req.user.role === "hr"
    ) {
      expenses = await Expense.find()
        .populate("site", "siteName")
        .populate("siteEngineer", "name");
    } else {
      expenses = await Expense.find({
        siteEngineer: req.user._id,
      })
        .populate("site", "siteName")
        .populate("siteEngineer", "name");
    }

    res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
};
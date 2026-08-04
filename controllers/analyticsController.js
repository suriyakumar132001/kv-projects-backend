const Employee = require("../models/Employee");
const Site = require("../models/Site");
const Client = require("../models/Client");
const Vendor = require("../models/Vendor");
const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");
const Inventory = require("../models/Inventory");
const Budget = require("../models/Budget");

// ==========================================
// Dashboard Summary
// ==========================================

const getDashboardSummary = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const totalSites = await Site.countDocuments();
    const totalClients = await Client.countDocuments();
    const totalVendors = await Vendor.countDocuments();

    const pendingInvoices = await Invoice.countDocuments({
      paymentStatus: { $ne: "Paid" },
    });

    const paidInvoices = await Invoice.countDocuments({
      paymentStatus: "Paid",
    });

    const revenue = await Invoice.aggregate([
      {
        $match: {
          paymentStatus: "Paid",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$grandTotal",
          },
        },
      },
    ]);

    const expenses = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const budgets = await Budget.aggregate([
      {
        $group: {
          _id: null,
          totalBudget: {
            $sum: "$totalBudget",
          },
          usedBudget: {
            $sum: "$actualExpense",
          },
          remainingBudget: {
            $sum: "$remainingBudget",
          },
        },
      },
    ]);

    const inventory = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          items: {
            $sum: 1,
          },
          totalStock: {
            $sum: "$availableStock",
          },
        },
      },
    ]);

    const totalRevenue =
      revenue.length > 0 ? revenue[0].total : 0;

    const totalExpenses =
      expenses.length > 0 ? expenses[0].total : 0;

    const totalProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      success: true,
      summary: {
        totalEmployees,
        totalSites,
        totalClients,
        totalVendors,

        totalRevenue,
        totalExpenses,
        totalProfit,

        pendingInvoices,
        paidInvoices,

        inventoryItems:
          inventory.length > 0 ? inventory[0].items : 0,

        totalStock:
          inventory.length > 0 ? inventory[0].totalStock : 0,

        totalBudget:
          budgets.length > 0 ? budgets[0].totalBudget : 0,

        usedBudget:
          budgets.length > 0 ? budgets[0].usedBudget : 0,

        remainingBudget:
          budgets.length > 0 ? budgets[0].remainingBudget : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Monthly Revenue
// ==========================================

const getMonthlyRevenue = async (req, res) => {
  try {
    const revenue = await Invoice.aggregate([
      {
        $match: {
          paymentStatus: "Paid",
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$invoiceDate" },
          },
          amount: {
            $sum: "$grandTotal",
          },
        },
      },
      {
        $sort: {
          "_id.month": 1,
        },
      },
    ]);

    res.json({
      success: true,
      revenue,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Monthly Expenses
// ==========================================

const getMonthlyExpenses = async (req, res) => {
  try {
    const expenses = await Expense.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$expenseDate" },
          },
          amount: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          "_id.month": 1,
        },
      },
    ]);

    res.json({
      success: true,
      expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Budget Summary
// ==========================================

const getBudgetSummary = async (req, res) => {
  try {
    const budget = await Budget.aggregate([
      {
        $group: {
          _id: null,
          totalBudget: {
            $sum: "$totalBudget",
          },
          usedBudget: {
            $sum: "$actualExpense",
          },
          remainingBudget: {
            $sum: "$remainingBudget",
          },
        },
      },
    ]);

    res.json({
      success: true,
      budget: budget.length ? budget[0] : {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Inventory Summary
// ==========================================

const getInventorySummary = async (req, res) => {
  try {
    const inventory = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          items: {
            $sum: 1,
          },
          totalStock: {
            $sum: "$availableStock",
          },
        },
      },
    ]);

    res.json({
      success: true,
      inventory: inventory.length ? inventory[0] : {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
  getMonthlyRevenue,
  getMonthlyExpenses,
  getBudgetSummary,
  getInventorySummary,
};
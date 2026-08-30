const Employee = require("../models/Employee");
const Site = require("../models/Site");
const Client = require("../models/Client");
const Vendor = require("../models/Vendor");
const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");
const Inventory = require("../models/Inventory");
const Budget = require("../models/Budget");
const PurchaseOrder = require("../models/PurchaseOrder");
const Project = require("../models/Project");

// ==========================================
// Period Helper (Phase 6)
//
// Turns a "30d" | "90d" | "1y" | "all" query param into a lower
// bound Date for filtering on createdAt. "all" (or anything
// unrecognized) means no lower bound.
// ==========================================

const getPeriodStartDate = (period) => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  switch (period) {
    case "30d":
      return new Date(now - 30 * DAY);
    case "90d":
      return new Date(now - 90 * DAY);
    case "1y":
      return new Date(now - 365 * DAY);
    case "all":
    default:
      return null;
  }
};

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

    // FIX: the Inventory model's stock field is "quantity" — there is
    // no "availableStock" field on the schema, so this aggregation was
    // always summing undefined and reporting totalStock as 0.
    const inventory = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          items: {
            $sum: 1,
          },
          totalStock: {
            $sum: "$quantity",
          },
        },
      },
    ]);

    const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

    const totalExpenses = expenses.length > 0 ? expenses[0].total : 0;

    const totalProfit = totalRevenue - totalExpenses;

    const outstandingAgg = await Invoice.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]);

    const totalOutstanding =
      outstandingAgg.length > 0 ? outstandingAgg[0].total : 0;

    const totalProjects = await Project.countDocuments();

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

        inventoryItems: inventory.length > 0 ? inventory[0].items : 0,

        totalStock: inventory.length > 0 ? inventory[0].totalStock : 0,

        totalBudget: budgets.length > 0 ? budgets[0].totalBudget : 0,

        usedBudget: budgets.length > 0 ? budgets[0].usedBudget : 0,

        remainingBudget: budgets.length > 0 ? budgets[0].remainingBudget : 0,

        // Used by the Advanced Dashboard KPI strip.
        totalProjects,
        totalOutstanding,
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
    // Same fix as getDashboardSummary — "quantity" is the real field.
    const inventory = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          items: {
            $sum: 1,
          },
          totalStock: {
            $sum: "$quantity",
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

// ==========================================
// Purchase Order Summary  (Phase 6 — Advanced Dashboard)
// GET /api/analytics/purchase-orders?period=30d
// ==========================================

const getPurchaseOrderSummary = async (req, res) => {
  try {
    const { period = "30d" } = req.query;
    const startDate = getPeriodStartDate(period);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};

    const statusBreakdownAgg = await PurchaseOrder.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const statusBreakdown = statusBreakdownAgg.map((row) => ({
      status: row._id,
      count: row.count,
    }));

    const openCount = await PurchaseOrder.countDocuments({
      ...dateMatch,
      status: { $in: ["Ordered", "Partially Received"] },
    });

    const recentDocs = await PurchaseOrder.find(dateMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("vendor", "vendorName");

    const recent = recentDocs.map((po) => ({
      id: po._id,
      poNumber: po.poNumber,
      vendorName: po.vendor?.vendorName || "-",
      amount: po.totalAmount,
      status: po.status,
      date: po.createdAt,
    }));

    res.status(200).json({
      success: true,
      statusBreakdown,
      openCount,
      recent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Top Vendors by Spend  (Phase 6 — Advanced Dashboard)
// GET /api/analytics/vendors/top?period=30d&limit=5
// ==========================================

const getTopVendors = async (req, res) => {
  try {
    const { period = "30d", limit = 5 } = req.query;
    const startDate = getPeriodStartDate(period);
    const dateMatch = startDate ? { createdAt: { $gte: startDate } } : {};
    const safeLimit = Number(limit) > 0 ? Number(limit) : 5;

    const topVendorsAgg = await PurchaseOrder.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$vendor",
          totalSpend: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpend: -1 } },
      { $limit: safeLimit },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      {
        $unwind: {
          path: "$vendor",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const vendors = topVendorsAgg.map((row) => ({
      id: row._id,
      name: row.vendor?.vendorName || "Unknown Vendor",
      totalSpend: row.totalSpend,
      orderCount: row.orderCount,
    }));

    res.status(200).json({
      success: true,
      vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Low Stock Inventory  (Phase 6 — Advanced Dashboard)
// GET /api/analytics/inventory/low-stock
//
// "Low stock" = quantity <= reorderLevel. reorderLevel is a new
// field added to the Inventory model (default 10) — see Inventory.js.
// category is best-effort, joined from the Material master by
// materialName (Inventory doesn't store a Material ref), so items
// with no matching Material record fall back to "General".
// ==========================================

const getLowStockItems = async (req, res) => {
  try {
    const lowStockDocs = await Inventory.aggregate([
      {
        $match: {
          $expr: { $lte: ["$quantity", "$reorderLevel"] },
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "materialName",
          foreignField: "materialName",
          as: "materialInfo",
        },
      },
      {
        $unwind: {
          path: "$materialInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { quantity: 1 } },
    ]);

    const items = lowStockDocs.map((row) => ({
      id: row._id,
      name: row.materialName,
      category: row.materialInfo?.category || "General",
      currentStock: row.quantity,
      reorderLevel: row.reorderLevel,
    }));

    res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Overdue Invoices  (Phase 6 — Advanced Dashboard)
// GET /api/analytics/invoices/overdue
// ==========================================

const getOverdueInvoices = async (req, res) => {
  try {
    const now = new Date();

    const overdueDocs = await Invoice.find({
      paymentStatus: { $ne: "Paid" },
      dueDate: { $lt: now },
    })
      .populate("client", "clientName")
      .sort({ dueDate: 1 });

    const invoices = overdueDocs.map((inv) => {
      const daysOverdue = Math.max(
        0,
        Math.floor((now - inv.dueDate) / (1000 * 60 * 60 * 24)),
      );

      return {
        id: inv._id,
        invoiceNo: inv.invoiceNumber,
        clientName: inv.client?.clientName || "-",
        amount: inv.grandTotal,
        dueDate: inv.dueDate,
        daysOverdue,
      };
    });

    res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Project Status Overview  (Phase 6 — Advanced Dashboard)
// GET /api/analytics/projects/status
//
// Same budget-vs-actualCost logic as profitabilityController's
// getAllProjectsProfitability, just remapped to the field names the
// Advanced Dashboard table expects (id/name/spent vs _id/projectName/
// actualCost). Kept as a separate query here (rather than importing
// profitabilityController) so this module's routes/permissions stay
// self-contained under /api/analytics.
// ==========================================

const getProjectStatusOverview = async (req, res) => {
  try {
    const projects = await Project.find().select("projectName status budget");

    const expenseAgg = await Expense.aggregate([
      {
        $group: {
          _id: "$project",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const spentByProject = {};
    expenseAgg.forEach((row) => {
      if (row._id) {
        spentByProject[row._id.toString()] = row.total;
      }
    });

    const result = projects.map((project) => ({
      id: project._id,
      name: project.projectName,
      budget: project.budget || 0,
      spent: spentByProject[project._id.toString()] || 0,
      status: project.status,
    }));

    res.status(200).json({
      success: true,
      projects: result,
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
  getPurchaseOrderSummary,
  getTopVendors,
  getLowStockItems,
  getOverdueInvoices,
  getProjectStatusOverview,
};

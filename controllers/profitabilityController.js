// ===============================================
// KV Projects ERP
// Project Profitability Controller
//
// Revenue is calculated from the "Invoice" model: matched
// on the "project" ref field, summing "grandTotal" for
// invoices where paymentStatus === "Paid". Invoices with
// paymentStatus "Partial" or "Pending" are not counted as
// realized revenue yet — if you want partially-paid amounts
// included, that should come from your Payment model instead
// (actual money received) rather than the Invoice total.
// ===============================================

const mongoose = require("mongoose");
const Project = require("../models/Project");
const Expense = require("../models/Expense");
const Invoice = require("../models/Invoice");

// ===============================================
// Get Profitability for a Single Project
// GET /api/profitability/:projectId
// ===============================================

const getProjectProfitability = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project id",
      });
    }

    const project = await Project.findById(projectId)
      .populate("projectManager", "name email")
      .populate("site", "siteName");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ---------------------------------------------
    // Actual Cost — sum of all expenses for this project
    // ---------------------------------------------

    const expenseAgg = await Expense.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const expensesByCategory = {};
    let actualCost = 0;

    expenseAgg.forEach((row) => {
      expensesByCategory[row._id] = row.total;
      actualCost += row.total;
    });

    // ---------------------------------------------
    // Revenue — sum of paid invoices for this project
    // (see ⚠️ ASSUMPTION note at top of file)
    // ---------------------------------------------

    const revenueAgg = await Invoice.aggregate([
      { $match: { project: project._id, paymentStatus: "Paid" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$grandTotal" },
        },
      },
    ]);

    const revenue = revenueAgg[0]?.total || 0;

    // ---------------------------------------------
    // Derived figures
    // ---------------------------------------------

    const budget = project.budget || 0;
    const variance = budget - actualCost;
    const profit = revenue - actualCost;
    const budgetUsedPercent =
      budget > 0 ? Math.round((actualCost / budget) * 100) : 0;

    res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        status: project.status,
        projectManager: project.projectManager,
        site: project.site,
      },
      budget,
      actualCost,
      revenue,
      variance,
      profit,
      budgetUsedPercent,
      isOverBudget: actualCost > budget && budget > 0,
      expensesByCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Get Profitability Summary for All Projects
// GET /api/profitability
// (feeds the Advanced Dashboard — Phase 6)
// ===============================================

const getAllProjectsProfitability = async (req, res) => {
  try {
    const projects = await Project.find().select(
      "projectName clientName status budget",
    );

    const expenseAgg = await Expense.aggregate([
      {
        $group: {
          _id: "$project",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const expenseByProject = {};
    expenseAgg.forEach((row) => {
      if (row._id) {
        expenseByProject[row._id.toString()] = row.total;
      }
    });

    const revenueAgg = await Invoice.aggregate([
      { $match: { paymentStatus: "Paid" } },
      {
        $group: {
          _id: "$project",
          total: { $sum: "$grandTotal" },
        },
      },
    ]);

    const revenueByProject = {};

    revenueAgg.forEach((row) => {
      if (row._id) {
        revenueByProject[row._id.toString()] = row.total;
      }
    });

    const summary = projects.map((project) => {
      const id = project._id.toString();
      const actualCost = expenseByProject[id] || 0;
      const revenue = revenueByProject[id] || 0;
      const budget = project.budget || 0;

      return {
        _id: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        status: project.status,
        budget,
        actualCost,
        revenue,
        variance: budget - actualCost,
        profit: revenue - actualCost,
        isOverBudget: actualCost > budget && budget > 0,
      };
    });

    res.status(200).json({
      success: true,
      count: summary.length,
      projects: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getProjectProfitability,
  getAllProjectsProfitability,
};

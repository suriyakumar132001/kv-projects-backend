// ===============================================
// KV Projects ERP
// Project Controller
// ===============================================

const Project = require("../models/Project");
const Expense = require("../models/Expense");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const DPR = require("../models/DPR");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const MaterialRequest = require("../models/MaterialRequest");

// ===============================================
// Create Project
// ===============================================

const createProject = async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Project Created Successfully",
      project,
    });
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Get All Projects
// ===============================================

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Get Single Project
// ===============================================

const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Update Project
// ===============================================

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    ).populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Project Updated Successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Delete Project
// ===============================================

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: "Project Deleted Successfully",
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Project Statistics
// ===============================================

const getProjectStats = async (req, res) => {
  try {
    const [
      totalProjects,
      runningProjects,
      pendingProjects,
      completedProjects,
      onHoldProjects,
    ] = await Promise.all([
      Project.countDocuments(),

      Project.countDocuments({
        status: "Running",
      }),

      Project.countDocuments({
        status: "Pending",
      }),

      Project.countDocuments({
        status: "Completed",
      }),

      Project.countDocuments({
        status: "On Hold",
      }),
    ]);

    // Calculate total project budget
    const budgetResult = await Project.aggregate([
      {
        $group: {
          _id: null,
          totalBudget: {
            $sum: {
              $ifNull: ["$budget", 0],
            },
          },
        },
      },
    ]);

    const totalBudget =
      budgetResult.length > 0 ? budgetResult[0].totalBudget : 0;

    res.status(200).json({
      success: true,

      stats: {
        totalProjects,
        runningProjects,
        pendingProjects,
        completedProjects,
        onHoldProjects,
        totalBudget,
      },
    });
  } catch (error) {
    console.error("GET PROJECT STATS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Project 360° Dashboard
// ===============================================

const getProject360 = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =============================================
    // Project Values
    // =============================================

    const budget = Number(project.budget || 0);

    const progress = Math.min(100, Math.max(0, Number(project.progress || 0)));

    // =============================================
    // Current Date
    // =============================================

    const today = new Date();

    let daysRemaining = null;

    if (project.endDate) {
      const endDate = new Date(project.endDate);

      const difference = endDate.getTime() - today.getTime();

      daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));
    }

    // =============================================
    // Actual Cost (from Expenses)
    // =============================================

    const expenseAggregate = await Expense.aggregate([
      {
        $match: { project: project._id },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
        },
      },
    ]);

    const categoryTotals = expenseAggregate.reduce((acc, item) => {
      acc[item._id || "Miscellaneous"] = item.amount;
      return acc;
    }, {});

    const actualCost = expenseAggregate.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // =============================================
    // Revenue (from Invoices + Payments)
    // =============================================

    const projectInvoices = await Invoice.find({
      project: project._id,
    }).select("_id grandTotal paymentStatus");

    const totalInvoiced = projectInvoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal || 0),
      0,
    );

    const invoiceIds = projectInvoices.map((inv) => inv._id);

    const paymentAggregate = invoiceIds.length
      ? await Payment.aggregate([
          {
            $match: { invoice: { $in: invoiceIds } },
          },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: "$amount" },
            },
          },
        ])
      : [];

    const totalReceived = paymentAggregate[0]?.totalReceived || 0;

    const outstandingAmount = Math.max(totalInvoiced - totalReceived, 0);

    // =============================================
    // Financial Summary
    // =============================================

    const remainingBudget = budget - actualCost;

    const utilizationPercentage =
      budget > 0 ? Math.min((actualCost / budget) * 100, 100) : 0;

    const financial = {
      budget,

      actualCost,

      remainingBudget,

      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
    };

    // =============================================
    // Profitability
    // =============================================
    //
    // profit: cash-basis, actual money received minus
    //         actual money spent
    // accrualProfit: what's billed minus what's spent,
    //         regardless of whether it's been paid yet
    //

    const profit = totalReceived - actualCost;

    const accrualProfit = totalInvoiced - actualCost;

    const profitMargin =
      totalInvoiced > 0
        ? Math.round((accrualProfit / totalInvoiced) * 10000) / 100
        : 0;

    const profitability = {
      totalInvoiced,

      totalReceived,

      outstandingAmount,

      actualCost,

      profit,

      accrualProfit,

      profitMargin,

      budgetVariance: remainingBudget,

      isOverBudget: actualCost > budget && budget > 0,
    };

    // =============================================
    // Site Summary (from DPR)
    // =============================================
    //
    // DPR is linked to a Site, not directly to a
    // Project, so this only works when the project
    // has a site assigned. Otherwise we fall back to
    // the zeroed placeholder — there is nothing to
    // report yet.
    //

    let siteSummary = {
      labour: 0,

      materials: 0,

      equipment: 0,

      dprSubmitted: false,
    };

    if (project.site) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [todayReport, totalReportsSubmitted, lastReport] =
        await Promise.all([
          DPR.findOne({
            site: project.site,
            reportDate: { $gte: todayStart, $lte: todayEnd },
          }),

          DPR.countDocuments({ site: project.site }),

          DPR.findOne({ site: project.site })
            .sort({ reportDate: -1 })
            .select("reportDate progress"),
        ]);

      const sumValues = (obj) => {
        if (!obj) return 0;

        const plain = obj.toObject ? obj.toObject() : obj;

        return Object.values(plain).reduce(
          (sum, val) => sum + Number(val || 0),
          0,
        );
      };

      siteSummary = {
        // Total headcount reported today, across all
        // labour types (mason + helper + carpenter...)
        labour: todayReport ? sumValues(todayReport.labour) : 0,

        // Total material units reported today, across
        // all material types. Units differ per material
        // (bags, kg, cft) so this is a rough headline
        // number — see materialsBreakdown for detail.
        materials: todayReport ? sumValues(todayReport.materials) : 0,

        // Not tracked yet — no Equipment/Asset-per-site
        // workflow exists in DPR at this time.
        equipment: 0,

        dprSubmitted: !!todayReport,

        labourBreakdown: todayReport ? todayReport.labour : null,

        materialsBreakdown: todayReport ? todayReport.materials : null,

        totalReportsSubmitted,

        lastReportDate: lastReport ? lastReport.reportDate : null,
      };
    }

    // =============================================
    // Purchase Summary (from PurchaseOrder)
    // =============================================
    //
    // Same constraint as siteSummary: PurchaseOrder is
    // linked to Site, not Project, so this only populates
    // when the project has a site assigned.
    //
    // NOTE: "received" counts POs whose status is
    // "Delivered". The GRN controller currently marks a
    // PO "Delivered" on the FIRST goods receipt against
    // it, even if that receipt is a partial delivery —
    // so until that's fixed at the source, this number
    // can over-report fully-received orders.
    //

    let purchases = {
      total: 0,

      pending: 0,

      approved: 0,

      received: 0,
    };

    if (project.site) {
      const sitePOs = await PurchaseOrder.find({ site: project.site });

      const statusCounts = sitePOs.reduce((acc, po) => {
        acc[po.status] = (acc[po.status] || 0) + 1;
        return acc;
      }, {});

      const totalValue = sitePOs.reduce(
        (sum, po) => sum + Number(po.totalAmount || 0),
        0,
      );

      // Value still committed but not yet in hand — anything
      // not Delivered or Cancelled
      const pendingValue = sitePOs
        .filter((po) => !["Delivered", "Cancelled"].includes(po.status))
        .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);

      // Past expected delivery and still not resolved
      const overduePOs = sitePOs.filter(
        (po) =>
          po.expectedDelivery &&
          new Date(po.expectedDelivery) < today &&
          !["Delivered", "Cancelled"].includes(po.status),
      );

      purchases = {
        total: sitePOs.length,

        pending: statusCounts["Pending"] || 0,

        approved: statusCounts["Approved"] || 0,

        received: statusCounts["Delivered"] || 0,

        partiallyReceived: statusCounts["Partially Delivered"] || 0,

        ordered: statusCounts["Ordered"] || 0,

        cancelled: statusCounts["Cancelled"] || 0,

        totalValue,

        pendingValue,

        overdueCount: overduePOs.length,
      };
    }

    // =============================================
    // Expense Summary
    // =============================================

    const expenses = {
      total: actualCost,

      categoryTotals,
    };

    // =============================================
    // Alerts
    // =============================================

    const alerts = [];

    // =============================================
    // Budget Alert
    // =============================================

    if (budget === 0) {
      alerts.push("Project budget has not been configured.");
    }

    if (profitability.isOverBudget) {
      alerts.push("Project expenses have exceeded the allocated budget.");
    } else if (actualCost > 0 && utilizationPercentage >= 90) {
      alerts.push("Project has used over 90% of its allocated budget.");
    }

    if (outstandingAmount > 0) {
      alerts.push(
        `There is an outstanding receivable of ₹${outstandingAmount.toLocaleString("en-IN")}.`,
      );
    }

    if (
      project.status === "Running" &&
      project.site &&
      !siteSummary.dprSubmitted
    ) {
      alerts.push("Today's Daily Progress Report has not been submitted.");
    }

    if (project.site && purchases.overdueCount > 0) {
      alerts.push(
        `${purchases.overdueCount} purchase order(s) are past their expected delivery date.`,
      );
    }

    // =============================================
    // End Date Alert
    // =============================================

    if (
      daysRemaining !== null &&
      daysRemaining < 0 &&
      project.status !== "Completed"
    ) {
      alerts.push("Project end date has passed.");
    }

    // =============================================
    // Progress Alert
    // =============================================

    if (project.status === "Running" && progress === 0) {
      alerts.push("Project is running but progress is still 0%.");
    }

    // =============================================
    // Project 360 Response
    // =============================================

    res.status(200).json({
      success: true,

      dashboard: {
        project: {
          _id: project._id,

          projectName: project.projectName,

          clientName: project.clientName,

          location: project.location,

          description: project.description,

          projectManager: project.projectManager || "",

          startDate: project.startDate,

          endDate: project.endDate,

          budget,

          progress,

          status: project.status,

          createdBy: project.createdBy,

          createdAt: project.createdAt,

          updatedAt: project.updatedAt,

          daysRemaining,
        },

        financial,

        profitability,

        siteSummary,

        purchases,

        expenses,

        alerts,
      },
    });
  } catch (error) {
    console.error("GET PROJECT 360 ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Project Profitability
// ===============================================
//
// Lightweight endpoint returning just Budget vs Actual
// Cost vs Revenue vs Profit, without the rest of the
// 360 dashboard payload.
// ===============================================

const getProjectProfitability = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select(
      "projectName budget status",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const budget = Number(project.budget || 0);

    // ---------------------------------------------
    // Actual Cost (Expenses)
    // ---------------------------------------------

    const expenseAggregate = await Expense.aggregate([
      {
        $match: { project: project._id },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
        },
      },
    ]);

    const categoryTotals = expenseAggregate.reduce((acc, item) => {
      acc[item._id || "Miscellaneous"] = item.amount;
      return acc;
    }, {});

    const actualCost = expenseAggregate.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // ---------------------------------------------
    // Revenue (Invoices + Payments)
    // ---------------------------------------------

    const projectInvoices = await Invoice.find({
      project: project._id,
    }).select("_id grandTotal paymentStatus");

    const totalInvoiced = projectInvoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal || 0),
      0,
    );

    const invoiceIds = projectInvoices.map((inv) => inv._id);

    const paymentAggregate = invoiceIds.length
      ? await Payment.aggregate([
          {
            $match: { invoice: { $in: invoiceIds } },
          },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: "$amount" },
            },
          },
        ])
      : [];

    const totalReceived = paymentAggregate[0]?.totalReceived || 0;

    const outstandingAmount = Math.max(totalInvoiced - totalReceived, 0);

    const remainingBudget = budget - actualCost;

    const utilizationPercentage =
      budget > 0 ? Math.min((actualCost / budget) * 100, 100) : 0;

    const profit = totalReceived - actualCost;

    const accrualProfit = totalInvoiced - actualCost;

    const profitMargin =
      totalInvoiced > 0
        ? Math.round((accrualProfit / totalInvoiced) * 10000) / 100
        : 0;

    res.status(200).json({
      success: true,

      profitability: {
        project: {
          _id: project._id,
          projectName: project.projectName,
          status: project.status,
        },

        budget,

        actualCost,

        remainingBudget,

        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,

        categoryTotals,

        totalInvoiced,

        totalReceived,

        outstandingAmount,

        profit,

        accrualProfit,

        profitMargin,

        isOverBudget: actualCost > budget && budget > 0,
      },
    });
  } catch (error) {
    console.error("GET PROJECT PROFITABILITY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Company-Wide Profitability
// ===============================================
//
// Aggregates revenue, cost, and profit across ALL
// projects — for the Owner/Admin dashboard overview.
// Route must be registered BEFORE "/:id" routes
// since "reports" is not a valid ObjectId segment
// but Express matches routes in order regardless.
// ===============================================

const getCompanyProfitability = async (req, res) => {
  try {
    // ---------------------------------------------
    // Project Counts + Total Budget
    // ---------------------------------------------

    const [
      totalProjects,
      runningProjects,
      pendingProjects,
      completedProjects,
      onHoldProjects,
      allProjects,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "Running" }),
      Project.countDocuments({ status: "Pending" }),
      Project.countDocuments({ status: "Completed" }),
      Project.countDocuments({ status: "On Hold" }),
      Project.find().select("projectName budget status site"),
    ]);

    const totalBudget = allProjects.reduce(
      (sum, p) => sum + Number(p.budget || 0),
      0,
    );

    // ---------------------------------------------
    // Expenses (all projects, grouped by project + category)
    // ---------------------------------------------

    const expenseByProject = await Expense.aggregate([
      {
        $match: { project: { $ne: null } },
      },
      {
        $group: {
          _id: "$project",
          amount: { $sum: "$amount" },
        },
      },
    ]);

    const expenseByProjectMap = expenseByProject.reduce((acc, item) => {
      acc[item._id.toString()] = item.amount;
      return acc;
    }, {});

    const totalExpense = expenseByProject.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const expenseByCategory = await Expense.aggregate([
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
        },
      },
    ]);

    const categoryTotals = expenseByCategory.reduce((acc, item) => {
      acc[item._id || "Miscellaneous"] = item.amount;
      return acc;
    }, {});

    // ---------------------------------------------
    // Invoices + Payments (all projects)
    // ---------------------------------------------

    const allInvoices = await Invoice.find({
      project: { $ne: null },
    }).select("_id project grandTotal paymentStatus dueDate");

    const totalInvoiced = allInvoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal || 0),
      0,
    );

    const invoiceIds = allInvoices.map((inv) => inv._id);

    const paymentAggregate = invoiceIds.length
      ? await Payment.aggregate([
          {
            $match: { invoice: { $in: invoiceIds } },
          },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: "$amount" },
            },
          },
        ])
      : [];

    const totalReceived = paymentAggregate[0]?.totalReceived || 0;

    const totalOutstanding = Math.max(totalInvoiced - totalReceived, 0);

    // ---------------------------------------------
    // Overdue Invoices
    // ---------------------------------------------

    const today = new Date();

    const overdueInvoices = allInvoices.filter(
      (inv) =>
        inv.paymentStatus !== "Paid" &&
        inv.dueDate &&
        new Date(inv.dueDate) < today,
    );

    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.grandTotal || 0),
      0,
    );

    // ---------------------------------------------
    // Missing DPR Today (Running projects only)
    // ---------------------------------------------

    const runningWithSite = allProjects.filter(
      (p) => p.status === "Running" && p.site,
    );

    const siteIds = runningWithSite.map((p) => p.site);

    let missingDPRToday = [];

    if (siteIds.length) {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const reportsToday = await DPR.find({
        site: { $in: siteIds },
        reportDate: { $gte: todayStart, $lte: todayEnd },
      }).select("site");

      const reportedSiteIds = new Set(
        reportsToday.map((r) => r.site.toString()),
      );

      missingDPRToday = runningWithSite
        .filter((p) => !reportedSiteIds.has(p.site.toString()))
        .map((p) => ({
          _id: p._id,
          projectName: p.projectName,
        }));
    }

    // ---------------------------------------------
    // Low Stock Items (all sites)
    // ---------------------------------------------
    //
    // Same minimumStock field getLowStock uses, just
    // rolled up here so Owner/Admin see it without a
    // separate trip to the Inventory page.
    // ---------------------------------------------

    const allInventory = await Inventory.find().populate("site", "siteName");

    const lowStockItems = allInventory
      .filter(
        (item) => Number(item.availableStock) <= Number(item.minimumStock),
      )
      .map((item) => ({
        _id: item._id,
        materialName: item.materialName,
        site: item.site,
        availableStock: item.availableStock,
        minimumStock: item.minimumStock,
      }));

    // ---------------------------------------------
    // Pending Material Request Approvals
    // ---------------------------------------------

    const pendingApprovalsCount = await MaterialRequest.countDocuments({
      status: "Pending",
    });

    // ---------------------------------------------
    // Over-Budget Projects
    // ---------------------------------------------

    const overBudgetProjects = allProjects
      .filter((p) => {
        const cost = expenseByProjectMap[p._id.toString()] || 0;
        return p.budget > 0 && cost > p.budget;
      })
      .map((p) => ({
        _id: p._id,
        projectName: p.projectName,
        budget: p.budget,
        actualCost: expenseByProjectMap[p._id.toString()] || 0,
      }));

    // ---------------------------------------------
    // Profit
    // ---------------------------------------------

    const totalProfit = totalInvoiced - totalExpense;

    const profitMargin =
      totalInvoiced > 0
        ? Math.round((totalProfit / totalInvoiced) * 10000) / 100
        : 0;

    res.status(200).json({
      success: true,

      companyOverview: {
        projects: {
          total: totalProjects,
          running: runningProjects,
          pending: pendingProjects,
          completed: completedProjects,
          onHold: onHoldProjects,
        },

        totalBudget,

        totalExpense,

        categoryTotals,

        totalInvoiced,

        totalReceived,

        totalOutstanding,

        totalProfit,

        profitMargin,

        overdueInvoices: {
          count: overdueInvoices.length,
          amount: overdueAmount,
        },

        overBudgetProjects,

        missingDPRToday,

        lowStockItems,

        pendingApprovalsCount,
      },
    });
  } catch (error) {
    console.error("GET COMPANY PROFITABILITY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Export Controllers
// ===============================================

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getProject360,
  getProjectProfitability,
  getCompanyProfitability,
};

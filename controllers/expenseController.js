// ===============================================
// KV Projects ERP
// Expense Controller
// ===============================================

const mongoose = require("mongoose");
const Expense = require("../models/Expense");

// ===============================================
// Helper: Check Valid ObjectId
// ===============================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ===============================================
// CREATE EXPENSE
// ===============================================

const createExpense = async (req, res) => {
  try {
    const {
      project,
      site,
      category,
      amount,
      vendorName,
      billNumber,
      description,
      expenseDate,
    } = req.body;

    // ---------------------------------------------
    // Validation
    // ---------------------------------------------

    if (!site) {
      return res.status(400).json({
        success: false,
        message: "Site is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid expense amount is required",
      });
    }

    if (!isValidObjectId(site)) {
      return res.status(400).json({
        success: false,
        message: "Invalid site ID",
      });
    }

    if (project && !isValidObjectId(project)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ---------------------------------------------
    // Create
    // ---------------------------------------------

    const expense = await Expense.create({
      project: project || undefined,
      site,
      siteEngineer: req.user._id,
      category: category || "Miscellaneous",
      amount: Number(amount),
      vendorName: vendorName || "",
      billNumber: billNumber || "",
      description: description || "",
      expenseDate: expenseDate || Date.now(),
    });

    // ---------------------------------------------
    // Populate
    // ---------------------------------------------

    await expense.populate([
      {
        path: "site",
        select: "siteName name",
      },
      {
        path: "siteEngineer",
        select: "name email role",
      },
    ]);

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Expense Added Successfully",
      expense,
    });
  } catch (error) {
    console.error("Create Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// GET ALL EXPENSES
// ===============================================

const getExpenses = async (req, res) => {
  try {
    const {
      search,
      category,
      project,
      site,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    // ---------------------------------------------
    // Build Query
    // ---------------------------------------------

    const query = {};

    // ---------------------------------------------
    // Role Based Access
    // ---------------------------------------------

    if (req.user.role === "siteengineer") {
      query.siteEngineer = req.user._id;
    }

    // ---------------------------------------------
    // Category
    // ---------------------------------------------

    if (category && category !== "all") {
      query.category = category;
    }

    // ---------------------------------------------
    // Project
    // ---------------------------------------------

    if (project && project !== "all") {
      if (!isValidObjectId(project)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      query.project = project;
    }

    // ---------------------------------------------
    // Site
    // ---------------------------------------------

    if (site && site !== "all") {
      if (!isValidObjectId(site)) {
        return res.status(400).json({
          success: false,
          message: "Invalid site ID",
        });
      }

      query.site = site;
    }

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

    if (search && search.trim()) {
      query.$or = [
        {
          vendorName: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          billNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // ---------------------------------------------
    // Date Filter
    // ---------------------------------------------

    if (startDate || endDate) {
      query.expenseDate = {};

      if (startDate) {
        query.expenseDate.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);

        end.setHours(23, 59, 59, 999);

        query.expenseDate.$lte = end;
      }
    }

    // ---------------------------------------------
    // Pagination
    // ---------------------------------------------

    const currentPage = Math.max(Number(page), 1);

    const pageLimit = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (currentPage - 1) * pageLimit;

    // ---------------------------------------------
    // Database
    // ---------------------------------------------

    const [expenses, totalExpenses] = await Promise.all([
      Expense.find(query)
        .populate("site", "siteName name")
        .populate("siteEngineer", "name email role")
        .sort({
          expenseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit),

      Expense.countDocuments(query),
    ]);

    // ---------------------------------------------
    // Total Amount
    // ---------------------------------------------

    const amountResult = await Expense.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const totalAmount = amountResult[0]?.totalAmount || 0;

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return res.status(200).json({
      success: true,

      count: expenses.length,

      totalExpenses,

      totalAmount,

      page: currentPage,

      limit: pageLimit,

      totalPages: Math.ceil(totalExpenses / pageLimit),

      expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// GET SINGLE EXPENSE
// ===============================================

const getExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id)
      .populate("site", "siteName name location")
      .populate("siteEngineer", "name email role");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // ---------------------------------------------
    // Site Engineer Ownership Check
    // ---------------------------------------------

    if (
      req.user.role === "siteengineer" &&
      expense.siteEngineer?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this expense",
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Get Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// UPDATE EXPENSE
// ===============================================

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // ---------------------------------------------
    // Ownership Check
    // ---------------------------------------------

    if (
      req.user.role === "siteengineer" &&
      expense.siteEngineer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this expense",
      });
    }

    // ---------------------------------------------
    // Allowed Fields
    // ---------------------------------------------

    const allowedFields = [
      "project",
      "site",
      "category",
      "amount",
      "vendorName",
      "billNumber",
      "description",
      "expenseDate",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    // ---------------------------------------------
    // Validation
    // ---------------------------------------------

    if (expense.amount === undefined || Number(expense.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid expense amount is required",
      });
    }

    if (expense.site && !isValidObjectId(expense.site)) {
      return res.status(400).json({
        success: false,
        message: "Invalid site ID",
      });
    }

    if (expense.project && !isValidObjectId(expense.project)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    expense.amount = Number(expense.amount);

    await expense.save();

    // ---------------------------------------------
    // Populate Updated Expense
    // ---------------------------------------------

    await expense.populate([
      {
        path: "site",
        select: "siteName name location",
      },
      {
        path: "siteEngineer",
        select: "name email role",
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Expense Updated Successfully",
      expense,
    });
  } catch (error) {
    console.error("Update Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// DELETE EXPENSE
// ===============================================

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // ---------------------------------------------
    // Ownership Check
    // ---------------------------------------------

    if (
      req.user.role === "siteengineer" &&
      expense.siteEngineer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this expense",
      });
    }

    await expense.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Expense Deleted Successfully",
    });
  } catch (error) {
    console.error("Delete Expense Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// EXPENSE STATISTICS
// ===============================================

const getExpenseStats = async (req, res) => {
  try {
    const query = {};

    // ---------------------------------------------
    // Site Engineer
    // ---------------------------------------------

    if (req.user.role === "siteengineer") {
      query.siteEngineer = req.user._id;
    }

    // ---------------------------------------------
    // Total Expense
    // ---------------------------------------------

    const totalResult = await Expense.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$amount",
          },
          totalCount: {
            $sum: 1,
          },
        },
      },
    ]);

    // ---------------------------------------------
    // Category Breakdown
    // ---------------------------------------------

    const categoryStats = await Expense.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$category",
          amount: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ]);

    // ---------------------------------------------
    // Monthly Breakdown
    // ---------------------------------------------

    const monthlyStats = await Expense.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: {
            year: {
              $year: "$expenseDate",
            },
            month: {
              $month: "$expenseDate",
            },
          },

          amount: {
            $sum: "$amount",
          },

          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,

      stats: {
        totalAmount: totalResult[0]?.totalAmount || 0,

        totalCount: totalResult[0]?.totalCount || 0,

        categoryStats,

        monthlyStats,
      },
    });
  } catch (error) {
    console.error("Expense Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// PROJECT EXPENSES
// ===============================================

const getProjectExpenses = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const query = {
      project: projectId,
    };

    // ---------------------------------------------
    // Site Engineer
    // ---------------------------------------------

    if (req.user.role === "siteengineer") {
      query.siteEngineer = req.user._id;
    }

    const expenses = await Expense.find(query)
      .populate("site", "siteName name")
      .populate("siteEngineer", "name email")
      .sort({
        expenseDate: -1,
      });

    // ---------------------------------------------
    // Total
    // ---------------------------------------------

    const totalResult = await Expense.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const totalAmount = totalResult[0]?.totalAmount || 0;

    return res.status(200).json({
      success: true,

      count: expenses.length,

      totalAmount,

      expenses,
    });
  } catch (error) {
    console.error("Project Expenses Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// EXPORT
// ===============================================

module.exports = {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getProjectExpenses,
};

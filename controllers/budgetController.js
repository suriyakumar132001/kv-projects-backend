const Budget = require("../models/Budget");

// =====================================
// Create Budget
// =====================================

const createBudget = async (req, res) => {
  try {

    const {
      site,
      materialBudget,
      labourBudget,
      equipmentBudget,
      miscellaneousBudget,
      totalBudget,
      actualExpense,
    } = req.body;

    const remainingBudget = totalBudget - actualExpense;

    const utilizationPercentage =
      (actualExpense / totalBudget) * 100;

    let status = "On Track";

    if (utilizationPercentage >= 100) {
      status = "Over Budget";
    } else if (utilizationPercentage >= 80) {
      status = "Warning";
    }

    const budget = await Budget.create({
      site,
      materialBudget,
      labourBudget,
      equipmentBudget,
      miscellaneousBudget,
      totalBudget,
      actualExpense,
      remainingBudget,
      utilizationPercentage,
      status,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Budget Created Successfully",
      budget,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Budgets
// =====================================

const getBudgets = async (req, res) => {

  try {

    const budgets = await Budget.find()
      .populate("site", "siteName")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: budgets.length,
      budgets,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Get Single Budget
// =====================================

const getBudget = async (req, res) => {

  try {

    const budget = await Budget.findById(req.params.id)
      .populate("site")
      .populate("createdBy", "name email");

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.status(200).json({
      success: true,
      budget,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Update Budget
// =====================================

const updateBudget = async (req, res) => {

  try {

    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const totalBudget =
      req.body.totalBudget ?? budget.totalBudget;

    const actualExpense =
      req.body.actualExpense ?? budget.actualExpense;

    req.body.remainingBudget =
      totalBudget - actualExpense;

    req.body.utilizationPercentage =
      (actualExpense / totalBudget) * 100;

    if (req.body.utilizationPercentage >= 100) {
      req.body.status = "Over Budget";
    } else if (req.body.utilizationPercentage >= 80) {
      req.body.status = "Warning";
    } else {
      req.body.status = "On Track";
    }

    const updatedBudget = await Budget.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Budget Updated Successfully",
      budget: updatedBudget,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Delete Budget
// =====================================

const deleteBudget = async (req, res) => {

  try {

    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    await budget.deleteOne();

    res.status(200).json({
      success: true,
      message: "Budget Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
};
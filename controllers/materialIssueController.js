const MaterialIssue = require("../models/MaterialIssue");
const Inventory = require("../models/Inventory");
const Material = require("../models/Material");
const Project = require("../models/Project");
const Expense = require("../models/Expense");

// =========================================
// Create Material Issue
// =========================================

const createMaterialIssue = async (req, res) => {
  try {
    const { site, materialName, quantity, unit, issuedFor, remarks } = req.body;

    const stock = await Inventory.findOne({ site, materialName });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Material not found in inventory",
      });
    }

    if (stock.availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    stock.availableStock -= quantity;
    stock.lastUpdated = new Date();
    await stock.save();

    const issue = await MaterialIssue.create({
      site,
      siteEngineer: req.user._id,
      materialName,
      quantity,
      unit,
      issuedFor,
      remarks,
    });

    // =====================================
    // Auto-log this issue as a project Expense
    // =====================================
    //
    // MaterialIssue stores no price and no project — so we
    // resolve the rate from the Material master (a site-specific
    // rate first, falling back to any rate on record for that
    // material name) and resolve the project the same way DPR
    // does: Site -> Project.site.
    //
    // This is a best-effort side effect. If there's no rate on
    // file or no project linked to the site, the material issue
    // itself still succeeds — we skip the expense and say why in
    // a `warning` field, rather than blocking the site engineer's
    // actual task over a bookkeeping gap.
    // =====================================

    let expense = null;
    let warning = null;

    try {
      const materialRate =
        (await Material.findOne({ materialName, site }).sort({
          updatedAt: -1,
        })) ||
        (await Material.findOne({ materialName }).sort({ updatedAt: -1 }));

      const project = await Project.findOne({ site });

      const unitPrice = Number(materialRate?.price || 0);
      const amount = unitPrice * Number(quantity);

      if (!unitPrice) {
        warning = `No rate on file for "${materialName}" — issue recorded, but no expense was logged. Add a price in Material master to fix this going forward.`;
      } else {
        expense = await Expense.create({
          project: project ? project._id : null,
          site,
          siteEngineer: req.user._id,
          category: "Material",
          amount,
          vendorName: materialRate?.supplier || "",
          description:
            `${quantity} ${unit || materialRate?.unit || ""} of ${materialName} issued${
              issuedFor ? ` for ${issuedFor}` : ""
            }`.trim(),
          expenseDate: new Date(),
        });

        if (!project) {
          warning =
            "Expense logged against the site, but no project is linked to this site yet — it won't count toward any project's budget until one is.";
        }
      }
    } catch (expenseError) {
      console.error("MATERIAL ISSUE -> EXPENSE SYNC ERROR:", expenseError);
      warning =
        "Issue recorded, but the automatic expense entry failed — you may need to log this cost manually.";
    }

    res.status(201).json({
      success: true,
      message: "Material Issued Successfully",
      issue,
      remainingStock: stock.availableStock,
      expense,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get Material Issues
// =========================================

const getMaterialIssues = async (req, res) => {
  try {
    const issues = await MaterialIssue.find()
      .populate("site", "siteName")
      .populate("siteEngineer", "name email");

    res.status(200).json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createMaterialIssue,
  getMaterialIssues,
};

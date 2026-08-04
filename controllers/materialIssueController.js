const MaterialIssue = require("../models/MaterialIssue");
const Inventory = require("../models/Inventory");

// Create Material Issue
const createMaterialIssue = async (req, res) => {
  try {
    const {
      site,
      materialName,
      quantity,
      unit,
      issuedFor,
      remarks,
    } = req.body;

    const stock = await Inventory.findOne({
      site,
      materialName,
    });

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

    res.status(201).json({
      success: true,
      message: "Material Issued Successfully",
      issue,
      remainingStock: stock.availableStock,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// Get Material Issues
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
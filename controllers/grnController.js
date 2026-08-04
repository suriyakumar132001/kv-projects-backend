// =========================================
// KV Projects ERP
// GRN Controller
// =========================================

const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");

// =========================================
// Create Goods Receipt
// =========================================

const createGRN = async (req, res) => {
  try {
    const {
      grnNumber,
      purchaseOrder,
      site,
      vendor,
      receivedQuantity,
      remarks,
    } = req.body;

    // Check Purchase Order
    const po = await PurchaseOrder.findById(purchaseOrder);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Check Duplicate GRN Number
    const existingGRN = await GRN.findOne({ grnNumber });

    if (existingGRN) {
      return res.status(400).json({
        success: false,
        message: "GRN Number already exists",
      });
    }

    // Create GRN
    const grn = await GRN.create({
      grnNumber,
      purchaseOrder,
      site,
      vendor,
      receivedQuantity,
      remarks,
      receivedBy: req.user._id,
    });

    // Update Purchase Order Status
    po.status = "Delivered";
    await po.save();

    // =====================================
    // Update Inventory Automatically
    // =====================================

    let stock = await Inventory.findOne({
      site: site,
      materialName: po.materialName,
    });

    if (!stock) {
      stock = await Inventory.create({
        site: site,
        materialName: po.materialName,
        unit: po.unit,
        availableStock: receivedQuantity,
      });
    } else {
      stock.availableStock += receivedQuantity;
      stock.lastUpdated = new Date();
      await stock.save();
    }

    res.status(201).json({
      success: true,
      message: "Goods Receipt Created Successfully",
      grn,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get All GRNs
// =========================================

const getGRNs = async (req, res) => {
  try {
    const grns = await GRN.find()
      .populate("purchaseOrder", "poNumber materialName quantity")
      .populate("vendor", "vendorName")
      .populate("site", "siteName")
      .populate("receivedBy", "name email");

    res.status(200).json({
      success: true,
      count: grns.length,
      grns,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createGRN,
  getGRNs,
};
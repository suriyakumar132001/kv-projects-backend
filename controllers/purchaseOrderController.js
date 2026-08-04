// =========================================
// KV Projects ERP
// Purchase Order Controller
// =========================================

const PurchaseOrder = require("../models/PurchaseOrder");

// =========================================
// Create Purchase Order
// =========================================

const createPurchaseOrder = async (req, res) => {
  try {
    const {
      poNumber,
      site,
      vendor,
      materialName,
      quantity,
      unit,
      unitPrice,
      expectedDelivery,
    } = req.body;

    // Check duplicate PO Number
    const existingPO = await PurchaseOrder.findOne({ poNumber });

    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order Number already exists",
      });
    }

    const totalAmount = quantity * unitPrice;

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      site,
      vendor,
      materialName,
      quantity,
      unit,
      unitPrice,
      totalAmount,
      expectedDelivery,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Purchase Order Created Successfully",
      purchaseOrder,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =========================================
// Get All Purchase Orders
// =========================================

const getPurchaseOrders = async (req, res) => {

  try {

    const purchaseOrders = await PurchaseOrder.find()
      .populate("site", "siteName")
      .populate("vendor", "vendorName")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      purchaseOrders,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =========================================
// Update Purchase Order Status
// =========================================

const updatePOStatus = async (req, res) => {

  try {

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {

      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });

    }

    purchaseOrder.status = req.body.status;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase Order Status Updated",
      purchaseOrder,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  updatePOStatus,
};
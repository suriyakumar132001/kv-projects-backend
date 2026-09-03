// =========================================
// KV Projects ERP
// Purchase Order Controller
// =========================================

const PurchaseOrder = require("../models/PurchaseOrder");
const GRN = require("../models/GRN");
const {
  createNotification,
  notifyRoles,
} = require("../utils/createNotification");

// =========================================
// Create Purchase Order (manual / standalone)
//
// Note: POs created from an approved Material Request go
// through materialRequestController.convertToPurchaseOrder
// instead, which also links + updates the source request.
// This endpoint is for direct purchases with no request
// behind them.
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

    const existingPO = await PurchaseOrder.findOne({ poNumber });

    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order Number already exists",
      });
    }

    const totalAmount = Number(quantity) * Number(unitPrice);

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

    // ===============================================
    // NEW: Notify Owner (informational — this model has no
    // approval step; whoever creates a PO is already assumed
    // authorized to do so, so this is a spend heads-up only)
    // ===============================================
    try {
      await notifyRoles(["accountant", "admin"], {
          type: "pending_approval",
          title: "New Purchase Order Created",
          message: `PO #${purchaseOrder.poNumber} for ${purchaseOrder.materialName} (₹${purchaseOrder.totalAmount}) was created`,
          link: (recipient) => `/${recipient.role}/purchase-orders/view/${purchaseOrder._id}`,
          relatedModel: "PurchaseOrder",
          relatedId: purchaseOrder._id,
        });
    } catch (notifyErr) {
      console.error(
        "Notification error (create purchase order):",
        notifyErr.message,
      );
    }

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
// Optional filters: ?status=, ?site=
// =========================================

const getPurchaseOrders = async (req, res) => {
  try {
    const { status, site } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (site) {
      query.site = site;
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("site", "siteName")
      .populate("vendor", "vendorName")
      .populate("materialRequest", "materialName")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

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
// Get Single Purchase Order (with its GRNs)
// =========================================

const getSinglePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate("site", "siteName")
      .populate("vendor", "vendorName")
      .populate("materialRequest", "materialName quantity unit")
      .populate("createdBy", "name email");

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    const grns = await GRN.find({ purchaseOrder: purchaseOrder._id })
      .populate("receivedBy", "name email")
      .sort({ receivedDate: -1 });

    res.status(200).json({
      success: true,
      purchaseOrder,
      grns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Cancel a Purchase Order
// Only allowed while nothing has been received yet.
// =========================================

const cancelPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (purchaseOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This Purchase Order is already cancelled",
      });
    }

    if (purchaseOrder.receivedQuantity > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel a Purchase Order that already has material received against it",
      });
    }

    purchaseOrder.status = "Cancelled";
    await purchaseOrder.save();

    try {
      await createNotification({
        recipient: purchaseOrder.createdBy,
        type: "general",
        title: "Purchase Order Cancelled",
        message: `Purchase Order ${purchaseOrder.poNumber} was cancelled`,
        link: (recipient) => `/${recipient?.role || "admin"}/purchase-orders/view/${purchaseOrder._id}`,
        relatedModel: "PurchaseOrder",
        relatedId: purchaseOrder._id,
      });
      await notifyRoles(["accountant"], {
        type: "general",
        title: "Purchase Order Cancelled",
        message: `Purchase Order ${purchaseOrder.poNumber} was cancelled`,
        link: (recipient) => `/${recipient.role}/purchase-orders/view/${purchaseOrder._id}`,
        relatedModel: "PurchaseOrder",
        relatedId: purchaseOrder._id,
      });
    } catch (notifyErr) {
      console.error("Notification error (cancel purchase order):", notifyErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Purchase Order cancelled",
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
  getSinglePurchaseOrder,
  cancelPurchaseOrder,
};

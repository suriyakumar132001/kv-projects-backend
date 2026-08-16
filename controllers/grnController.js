// =========================================
// KV Projects ERP
// GRN (Goods Receipt Note) Controller
//
// Recording a GRN is the single action that ties the whole
// material workflow together:
//   1. Creates the GRN record
//   2. Updates the parent PO's receivedQuantity + status
//   3. Increments (or creates) the site's Inventory stock
// =========================================

const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");

// =========================================
// Create GRN (receive material against a PO)
// =========================================

const createGRN = async (req, res) => {
  try {
    const { grnNumber, purchaseOrder, quantityReceived, condition, notes } =
      req.body;

    if (!quantityReceived || Number(quantityReceived) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid quantity received",
      });
    }

    const po = await PurchaseOrder.findById(purchaseOrder);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (po.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot receive material against a cancelled Purchase Order",
      });
    }

    if (po.status === "Received") {
      return res.status(400).json({
        success: false,
        message: "This Purchase Order has already been fully received",
      });
    }

    const existingGRN = await GRN.findOne({ grnNumber });

    if (existingGRN) {
      return res.status(400).json({
        success: false,
        message: "GRN Number already exists",
      });
    }

    const remaining = po.quantity - po.receivedQuantity;

    if (Number(quantityReceived) > remaining) {
      return res.status(400).json({
        success: false,
        message: `Quantity received exceeds the remaining balance on this PO (${remaining} ${po.unit} left)`,
      });
    }

    // 1. Create the GRN
    const grn = await GRN.create({
      grnNumber,
      purchaseOrder: po._id,
      site: po.site,
      materialName: po.materialName,
      unit: po.unit,
      quantityReceived,
      condition,
      notes,
      receivedBy: req.user._id,
    });

    // 2. Update the PO's received total + status
    po.receivedQuantity += Number(quantityReceived);
    po.status =
      po.receivedQuantity >= po.quantity ? "Received" : "Partially Received";
    await po.save();

    // 3. Update site inventory (create the stock row if it
    // doesn't exist yet for this site + material)
    const inventoryItem = await Inventory.findOneAndUpdate(
      { site: po.site, materialName: po.materialName },
      {
        $inc: { quantity: Number(quantityReceived) },
        $set: { unit: po.unit, lastUpdated: new Date() },
      },
      { new: true, upsert: true },
    );

    res.status(201).json({
      success: true,
      message: "Goods Receipt recorded and inventory updated",
      grn,
      purchaseOrder: po,
      inventoryItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get All GRNs
// Optional filters: ?purchaseOrder=, ?site=
// =========================================

const getGRNs = async (req, res) => {
  try {
    const { purchaseOrder, site } = req.query;

    const query = {};

    if (purchaseOrder) {
      query.purchaseOrder = purchaseOrder;
    }

    if (site) {
      query.site = site;
    }

    const grns = await GRN.find(query)
      .populate("purchaseOrder", "poNumber")
      .populate("site", "siteName")
      .populate("receivedBy", "name email")
      .sort({ receivedDate: -1 });

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

// =========================================
// Get Single GRN
// =========================================

const getSingleGRN = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate("purchaseOrder", "poNumber vendor quantity unit")
      .populate("site", "siteName")
      .populate("receivedBy", "name email");

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.status(200).json({
      success: true,
      grn,
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
  getSingleGRN,
};

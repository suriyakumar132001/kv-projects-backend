// =========================================
// KV Projects ERP
// Material Request Controller
// =========================================

const MaterialRequest = require("../models/MaterialRequest");
const PurchaseOrder = require("../models/PurchaseOrder");

// =========================================
// Create Material Request
// =========================================

const createMaterialRequest = async (req, res) => {
  try {
    const { site, materialName, quantity, unit, urgency, reason } = req.body;

    const request = await MaterialRequest.create({
      site,
      requestedBy: req.user._id,
      materialName,
      quantity,
      unit,
      urgency,
      reason,
    });

    res.status(201).json({
      success: true,
      message: "Material Request Submitted Successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get All Material Requests
// =========================================
//
// Same role-scoping pattern as DPR's getAllReports:
// site engineers only see their own requests, other
// roles see everything. Optional ?status= filter for
// the Owner/Admin approval queue.
// =========================================

const getMaterialRequests = async (req, res) => {
  try {
    const { status, site } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (site) {
      query.site = site;
    }

    if (req.user.role === "siteengineer") {
      query.requestedBy = req.user._id;
    }

    const requests = await MaterialRequest.find(query)
      .populate("site", "siteName")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("linkedPO", "poNumber status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get Single Material Request
// =========================================

const getSingleMaterialRequest = async (req, res) => {
  try {
    const request = await MaterialRequest.findById(req.params.id)
      .populate("site", "siteName")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("linkedPO", "poNumber status");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Material Request not found",
      });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Approve / Reject Material Request
// =========================================

const updateRequestStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Approved' or 'Rejected'",
      });
    }

    const request = await MaterialRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Material Request not found",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${request.status.toLowerCase()}`,
      });
    }

    request.status = status;
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();

    if (status === "Rejected") {
      request.rejectionReason = rejectionReason || "";
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: `Material Request ${status}`,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Convert Approved Request into a Purchase Order
// =========================================

const convertToPurchaseOrder = async (req, res) => {
  try {
    const { poNumber, vendor, unitPrice, expectedDelivery } = req.body;

    const request = await MaterialRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Material Request not found",
      });
    }

    if (request.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message:
          "Only an approved request can be converted into a Purchase Order",
      });
    }

    if (request.linkedPO) {
      return res.status(400).json({
        success: false,
        message:
          "This request has already been converted into a Purchase Order",
      });
    }

    const existingPO = await PurchaseOrder.findOne({ poNumber });

    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order Number already exists",
      });
    }

    const totalAmount = request.quantity * unitPrice;

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      materialRequest: request._id,
      site: request.site,
      vendor,
      materialName: request.materialName,
      quantity: request.quantity,
      unit: request.unit,
      unitPrice,
      totalAmount,
      expectedDelivery,
      createdBy: req.user._id,
    });

    request.status = "Ordered";
    request.linkedPO = purchaseOrder._id;
    await request.save();

    res.status(201).json({
      success: true,
      message: "Material Request converted into Purchase Order",
      purchaseOrder,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createMaterialRequest,
  getMaterialRequests,
  getSingleMaterialRequest,
  updateRequestStatus,
  convertToPurchaseOrder,
};

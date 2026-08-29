const mongoose = require("mongoose");
const LabourBill = require("../models/LabourBill");
const { recalcLabourBill } = require("../utils/labourBillCalc");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================
// Generate next bill number, e.g. KV-LB-0001
// =====================================

const generateBillNumber = async () => {
  const count = await LabourBill.countDocuments();
  return `KV-LB-${String(count + 1).padStart(4, "0")}`;
};

// =====================================
// Create Labour Bill
// =====================================

const createLabourBill = async (req, res) => {
  try {
    const { subcontractor, site, billPeriod, dailyEntries, items } = req.body;

    if (!isValidObjectId(subcontractor)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid subcontractor ID" });
    }
    if (!isValidObjectId(site)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid site ID" });
    }
    if (!billPeriod?.from || !billPeriod?.to) {
      return res
        .status(400)
        .json({ success: false, message: "Bill period (from/to) is required" });
    }

    // Never trust the client's totals — recompute from raw timesheet rows.
    const {
      dailyEntries: cleanEntries,
      items: cleanItems,
      grandTotal,
    } = recalcLabourBill(dailyEntries, items);

    const billNumber = await generateBillNumber();

    const bill = await LabourBill.create({
      ...req.body,
      billNumber,
      dailyEntries: cleanEntries,
      items: cleanItems,
      grandTotal,
      createdBy: req.user._id,
    });

    await bill.populate("subcontractor", "vendorName phone");
    await bill.populate("site", "siteName location");

    res.status(201).json({
      success: true,
      message: "Labour bill created successfully",
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Get All Labour Bills (filterable by site / subcontractor / status)
// =====================================

const getLabourBills = async (req, res) => {
  try {
    const { site, subcontractor, status } = req.query;
    const query = {};

    if (site) {
      if (!isValidObjectId(site)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid site ID" });
      }
      query.site = site;
    }

    if (subcontractor) {
      if (!isValidObjectId(subcontractor)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subcontractor ID" });
      }
      query.subcontractor = subcontractor;
    }

    if (status) query.status = status;

    const bills = await LabourBill.find(query)
      .populate("subcontractor", "vendorName phone")
      .populate("site", "siteName location")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bills.length, bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Get Single Labour Bill
// =====================================

const getLabourBill = async (req, res) => {
  try {
    const bill = await LabourBill.findById(req.params.id)
      .populate("subcontractor", "vendorName phone address")
      .populate("site", "siteName location")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Labour bill not found" });
    }

    res.status(200).json({ success: true, bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Update Labour Bill (re-runs the calc engine on every save)
// =====================================

const updateLabourBill = async (req, res) => {
  try {
    const bill = await LabourBill.findById(req.params.id);
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Labour bill not found" });
    }

    if (bill.status === "Paid") {
      return res
        .status(400)
        .json({ success: false, message: "A paid bill cannot be edited" });
    }

    const dailyEntries = req.body.dailyEntries ?? bill.dailyEntries;
    const items = req.body.items ?? bill.items;

    const {
      dailyEntries: cleanEntries,
      items: cleanItems,
      grandTotal,
    } = recalcLabourBill(dailyEntries, items);

    Object.assign(bill, req.body, {
      dailyEntries: cleanEntries,
      items: cleanItems,
      grandTotal,
    });

    await bill.save();

    res.status(200).json({
      success: true,
      message: "Labour bill updated successfully",
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Update Status (Submitted / Approved / Paid / Rejected)
// =====================================

const updateLabourBillStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Draft", "Submitted", "Approved", "Paid", "Rejected"];

    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const bill = await LabourBill.findById(req.params.id);
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Labour bill not found" });
    }

    bill.status = status;
    if (status === "Approved") bill.approvedBy = req.user._id;

    await bill.save();

    res.status(200).json({
      success: true,
      message: `Bill marked as ${status}`,
      bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Delete Labour Bill
// =====================================

const deleteLabourBill = async (req, res) => {
  try {
    const bill = await LabourBill.findById(req.params.id);
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Labour bill not found" });
    }

    if (bill.status === "Paid") {
      return res
        .status(400)
        .json({ success: false, message: "A paid bill cannot be deleted" });
    }

    await bill.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Labour bill deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLabourBill,
  getLabourBills,
  getLabourBill,
  updateLabourBill,
  updateLabourBillStatus,
  deleteLabourBill,
};

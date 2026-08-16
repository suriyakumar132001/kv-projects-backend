const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================
// Create Invoice
// =====================================

const createInvoice = async (req, res) => {
  try {
    // ---------------------------------------------
    // Validate Project Reference (optional field)
    // ---------------------------------------------

    if (req.body.project && !isValidObjectId(req.body.project)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const invoice = await Invoice.create({
      ...req.body,
      project: req.body.project || null,
      createdBy: req.user._id,
    });

    await invoice.populate("project", "projectName status budget");

    res.status(201).json({
      success: true,
      message: "Invoice Created Successfully",
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get All Invoices
// =====================================

const getInvoices = async (req, res) => {
  try {
    const { project } = req.query;

    const query = {};

    if (project) {
      if (!isValidObjectId(project)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      query.project = project;
    }

    const invoices = await Invoice.find(query)
      .populate("client", "clientName companyName phone")
      .populate("quotation", "quotationNumber")
      .populate("project", "projectName status")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get Single Invoice
// =====================================

const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client")
      .populate("quotation")
      .populate("project", "projectName status budget")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Invoice
// =====================================

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Invoice Updated Successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Payment Status
// =====================================

const updatePaymentStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    invoice.paymentStatus = req.body.paymentStatus;

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Payment Status Updated Successfully",
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Delete Invoice
// =====================================

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: "Invoice Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  updatePaymentStatus,
  deleteInvoice,
};

// =============================================
// KV Projects ERP
// Client Portal Data Controller
// =============================================
//
// Every query in this file is scoped by req.client._id
// (set by protectClient). This is deliberate: ownership
// is baked into the DB query itself — e.g.
//   Project.findOne({ _id: req.params.id, client: req.client._id })
// — rather than fetching first and checking afterwards.
// A client can never retrieve another client's data by
// guessing an ID; the query simply won't find it.
// =============================================

const Project = require("../models/Project");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const DPR = require("../models/DPR");

// =============================================
// Get My Projects
// =============================================

const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.client._id })
      .select(
        "projectName location description startDate endDate budget progress status",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Get My Project Detail (with recent site updates)
// =============================================

const getMyProjectDetail = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      client: req.client._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ---------------------------------------------
    // Recent DPR updates for this project's site.
    // Client-safe fields only — no labour counts,
    // no material costs, no internal remarks/issues.
    // Just what work was done, when, and photos.
    // ---------------------------------------------

    let recentUpdates = [];

    if (project.site) {
      recentUpdates = await DPR.find({ site: project.site })
        .select("reportDate workDescription progress images weather")
        .sort({ reportDate: -1 })
        .limit(10);
    }

    res.status(200).json({
      success: true,
      project,
      recentUpdates,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Get My Invoices
// =============================================

const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ client: req.client._id })
      .select(
        "invoiceNumber projectName invoiceDate dueDate subtotal tax discount grandTotal paymentStatus",
      )
      .sort({ invoiceDate: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Get My Payments
// =============================================

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ client: req.client._id })
      .populate("invoice", "invoiceNumber grandTotal")
      .select("paymentDate amount paymentMethod transactionId invoice")
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMyProjects,
  getMyProjectDetail,
  getMyInvoices,
  getMyPayments,
};

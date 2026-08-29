// =============================================
// KV Projects ERP
// Lead Controller (Sales & CRM pipeline)
// =============================================

const Lead = require("../models/Lead");
const Client = require("../models/Client");

const POPULATE_ASSIGNED = { path: "assignedTo", select: "name email" };
const POPULATE_CREATED = { path: "createdBy", select: "name email" };
const POPULATE_CONVERTED = { path: "convertedClient", select: "clientName" };
const POPULATE_NOTE_AUTHOR = { path: "notes.createdBy", select: "name" };

// =============================================
// Get All Leads
// Optional query params: stage, assignedTo
// =============================================

const getLeads = async (req, res) => {
  try {
    const filter = {};

    if (req.query.stage) {
      filter.stage = req.query.stage;
    }

    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo;
    }

    const leads = await Lead.find(filter)
      .populate(POPULATE_ASSIGNED)
      .populate(POPULATE_CREATED)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Get Single Lead
// =============================================

const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate(POPULATE_ASSIGNED)
      .populate(POPULATE_CREATED)
      .populate(POPULATE_CONVERTED)
      .populate(POPULATE_NOTE_AUTHOR);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Create Lead
// =============================================

const createLead = async (req, res) => {
  try {
    const {
      leadName,
      companyName,
      email,
      phone,
      projectType,
      source,
      estimatedValue,
      assignedTo,
      nextFollowUpDate,
    } = req.body;

    if (!leadName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Lead name and phone are required.",
      });
    }

    const lead = await Lead.create({
      leadName,
      companyName,
      email,
      phone,
      projectType,
      source,
      estimatedValue,
      assignedTo: assignedTo || null,
      nextFollowUpDate: nextFollowUpDate || null,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Update Lead
// =============================================

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Stage changes go through the dedicated /:id/stage endpoint so the
    // Lost-reason / Converted rules stay in one place — ignore it here.
    const { stage, convertedClient, ...updatableFields } = req.body;

    Object.assign(lead, updatableFields);
    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Move Lead to a New Stage
// body: { stage, lostReason? }
// =============================================

const updateStage = async (req, res) => {
  try {
    const { stage, lostReason } = req.body;

    if (!Lead.STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage.",
      });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (lead.stage === "Converted") {
      return res.status(400).json({
        success: false,
        message: "A converted lead's stage cannot be changed.",
      });
    }

    lead.stage = stage;

    if (stage === "Lost") {
      lead.lostReason = lostReason || "";
    } else if (stage !== "Converted") {
      lead.lostReason = "";
    }

    if (stage === "Contacted") {
      lead.lastContactedAt = new Date();
    }

    await lead.save();

    res.status(200).json({
      success: true,
      message: `Lead moved to ${stage}`,
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Add a Follow-up Note
// body: { text, nextFollowUpDate? }
// =============================================

const addNote = async (req, res) => {
  try {
    const { text, nextFollowUpDate } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note text is required.",
      });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    lead.notes.push({
      text: text.trim(),
      createdBy: req.user._id,
    });

    lead.lastContactedAt = new Date();

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
    }

    await lead.save();
    await lead.populate(POPULATE_NOTE_AUTHOR);

    res.status(200).json({
      success: true,
      message: "Note added",
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Convert Lead to Client
// Creates a Client record from the lead's details, links it back
// onto the lead, and flips the lead's stage to "Converted".
// =============================================

const convertToClient = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (lead.stage === "Converted") {
      return res.status(400).json({
        success: false,
        message: "This lead has already been converted.",
      });
    }

    if (!lead.email) {
      return res.status(400).json({
        success: false,
        message:
          "Lead needs an email on file before it can be converted to a client.",
      });
    }

    const client = await Client.create({
      clientName: req.body.clientName || lead.leadName,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      projectName: req.body.projectName || lead.projectType,
      status: "Lead",
      createdBy: req.user._id,
    });

    lead.stage = "Converted";
    lead.convertedClient = client._id;
    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead converted to client successfully",
      client,
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Delete Lead
// =============================================

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    await lead.deleteOne();

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateStage,
  addNote,
  convertToClient,
  deleteLead,
};

// =========================================
// KV Projects ERP
// Lead Controller (Sales & CRM pipeline)
// =========================================

const Lead = require("../models/Lead");
const Client = require("../models/Client");
const { createNotification } = require("../services/notificationService");

// =====================================
// Create Lead
// =====================================

const createLead = async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user._id,
    });

    if (lead.assignedTo) {
      await createNotification({
        recipient: lead.assignedTo,
        title: "New Lead Assigned",
        message: `${lead.leadName} was assigned to you.`,
        type: "general",
        link: `/leads/view/${lead._id}`,
        relatedModel: "Lead",
        relatedId: lead._id,
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: "Lead Created Successfully",
      lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Get All Leads
// Optional query params: stage, assignedTo
// =====================================

const getLeads = async (req, res) => {
  try {
    const filter = {};

    if (req.query.stage) filter.stage = req.query.stage;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    // Salespeople who aren't owner/admin only see their own leads.
    if (!["owner", "admin"].includes(req.user.role)) {
      filter.assignedTo = req.user._id;
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Get Single Lead
// =====================================

const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("notes.createdBy", "name")
      .populate("convertedClient", "clientName companyName");

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Update Lead
// =====================================

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Lead Updated Successfully",
      lead: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Move Lead to a New Stage
// =====================================

const updateStage = async (req, res) => {
  try {
    const { stage, lostReason } = req.body;

    const validStages = [
      "New Lead",
      "Contacted",
      "On Hold",
      "Lost",
      "Converted",
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, message: "Invalid stage" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    if (stage === "Converted" && lead.stage !== "Converted") {
      return res.status(400).json({
        success: false,
        message: "Use the Convert action to move a lead to Converted.",
      });
    }

    lead.stage = stage;
    if (stage === "Lost") lead.lostReason = lostReason || "";

    await lead.save();

    res.status(200).json({
      success: true,
      message: `Lead moved to ${stage}`,
      lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Add a Follow-up Note
// =====================================

const addNote = async (req, res) => {
  try {
    const { text, nextFollowUpDate } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Note text is required" });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    lead.notes.push({
      text: text.trim(),
      nextFollowUpDate: nextFollowUpDate || null,
      createdBy: req.user._id,
    });

    if (nextFollowUpDate) lead.nextFollowUpDate = nextFollowUpDate;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Note added",
      lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Convert Lead -> Client
//
// Duplicate-safe: matches an existing Client by email, phone, or
// company name before creating a new one, so the same prospect
// never ends up with two Client records.
// =====================================

const convertToClient = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    if (lead.stage === "Converted" && lead.convertedClient) {
      return res.status(400).json({
        success: false,
        message: "Lead has already been converted",
      });
    }

    // Look for an existing client to avoid duplicates
    const orConditions = [{ phone: lead.phone }];
    if (lead.email) orConditions.push({ email: lead.email });
    if (lead.companyName) orConditions.push({ companyName: lead.companyName });

    let client = await Client.findOne({ $or: orConditions });

    if (!client) {
      client = await Client.create({
        clientName: lead.leadName,
        companyName: lead.companyName || "",
        email: lead.email || `${lead.phone}@placeholder.local`,
        phone: lead.phone,
        projectName: lead.projectType || "",
        status: "Lead",
        createdBy: req.user._id,
      });
    }

    lead.stage = "Converted";
    lead.convertedClient = client._id;
    lead.convertedAt = new Date();
    lead.convertedBy = req.user._id;

    await lead.save();

    res.status(200).json({
      success: true,
      message: "Lead converted to client",
      lead,
      client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// Delete Lead
// =====================================

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    await lead.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Lead Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  updateStage,
  addNote,
  convertToClient,
  deleteLead,
};

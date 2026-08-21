const Lead = require("../models/Lead");
const Client = require("../models/Client");
const User = require("../models/User");
const {
  createNotificationForMany,
} = require("../services/notificationService");

// =====================================
// Create Lead
// =====================================

const createLead = async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Notify whoever the lead was assigned to (if anyone)
    try {
      if (lead.assignedTo) {
        await createNotificationForMany([lead.assignedTo], {
          type: "lead_followup",
          title: "New Lead Assigned",
          message: `${lead.leadName} (${lead.companyName || "no company"}) was assigned to you`,
          link: `/leads/view/${lead._id}`,
          relatedModel: "Lead",
          relatedId: lead._id,
        });
      }
    } catch (notifyErr) {
      console.error("Notification error (create lead):", notifyErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Lead Created Successfully",
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get All Leads
// Optional ?stage= filter for board columns,
// ?assignedTo= to scope a rep's own pipeline
// =====================================

const getLeads = async (req, res) => {
  try {
    const { stage, assignedTo } = req.query;

    const query = {};
    if (stage) query.stage = stage;
    if (assignedTo) query.assignedTo = assignedTo;

    const leads = await Lead.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });

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

// =====================================
// Get Single Lead
// =====================================

const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("notes.createdBy", "name")
      .populate("convertedClient", "clientName status");

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

// =====================================
// Update Lead (details, not stage — see updateLeadStage)
// =====================================

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Stage changes go through updateLeadStage so the notes
    // timeline and notifications stay consistent — strip it
    // here if someone sends it through this route by mistake.
    const { stage, ...rest } = req.body;

    const previousAssignee = lead.assignedTo?.toString();

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      rest,
      {
        new: true,
        runValidators: true,
      },
    );

    // Notify the newly assigned rep, if reassigned
    try {
      const newAssignee = updatedLead.assignedTo?.toString();
      if (newAssignee && newAssignee !== previousAssignee) {
        await createNotificationForMany([updatedLead.assignedTo], {
          type: "lead_followup",
          title: "Lead Assigned to You",
          message: `${updatedLead.leadName} (${updatedLead.companyName || "no company"}) was assigned to you`,
          link: `/leads/view/${updatedLead._id}`,
          relatedModel: "Lead",
          relatedId: updatedLead._id,
        });
      }
    } catch (notifyErr) {
      console.error("Notification error (reassign lead):", notifyErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Lead Updated Successfully",
      lead: updatedLead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Lead Stage
// Drives the Kanban board — moving a card between columns.
// =====================================

const updateLeadStage = async (req, res) => {
  try {
    const { stage, lostReason } = req.body;

    const validStages = ["New Lead", "Contacted", "On Hold", "Lost", "Converted"];

    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
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
        message: "A converted lead cannot change stage. Manage it via the Client record instead.",
      });
    }

    const previousStage = lead.stage;

    lead.stage = stage;

    if (stage === "Lost") {
      lead.lostReason = lostReason || lead.lostReason;
    }

    if (stage === "Contacted") {
      lead.lastContactedAt = new Date();
    }

    lead.notes.push({
      text: `Stage changed from ${previousStage} to ${stage}${
        stage === "Lost" && lostReason ? `: ${lostReason}` : ""
      }`,
      createdBy: req.user._id,
    });

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

// =====================================
// Add a Follow-up Note
// =====================================

const addLeadNote = async (req, res) => {
  try {
    const { text, nextFollowUpDate } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    lead.notes.push({ text, createdBy: req.user._id });
    lead.lastContactedAt = new Date();

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
    }

    await lead.save();

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

// =====================================
// Convert Lead to Client
// Creates a real Client record and marks the lead Converted.
// =====================================

const convertLeadToClient = async (req, res) => {
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
        message: "This lead has already been converted",
      });
    }

    if (!lead.email) {
      return res.status(400).json({
        success: false,
        message: "Lead needs an email on file before it can be converted to a client",
      });
    }

    const client = await Client.create({
      clientName: lead.leadName,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      projectName: req.body.projectName || "",
      status: "Lead", // still a client-side "Lead" status until a project kicks off
      createdBy: req.user._id,
    });

    lead.stage = "Converted";
    lead.convertedClient = client._id;
    lead.notes.push({
      text: `Converted to Client record (${client.clientName})`,
      createdBy: req.user._id,
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: "Lead Converted to Client",
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

// =====================================
// Delete Lead
// =====================================

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
      message: "Lead Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  updateLeadStage,
  addLeadNote,
  convertLeadToClient,
  deleteLead,
};

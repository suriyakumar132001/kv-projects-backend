const mongoose = require("mongoose");

// =============================================
// Lead
//
// Sales pipeline entry — separate from Client on purpose.
// A Lead is a prospect that hasn't been won yet; once it
// converts, we create a real Client (and optionally a
// Quotation off it) and mark the Lead as "Converted" rather
// than deleting it, so the sales history stays intact.
// =============================================

const leadSchema = new mongoose.Schema(
  {
    leadName: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    projectType: {
      type: String,
      default: "",
    },

    // Where the lead came from — Referral, Website, Site Visit, etc.
    // Free text, kept as a plain string so sales can enter anything.
    source: {
      type: String,
      default: "",
    },

    estimatedValue: {
      type: Number,
      default: 0,
    },

    // ---------------------------------------------
    // Pipeline stage
    // ---------------------------------------------
    stage: {
      type: String,
      enum: ["New Lead", "Contacted", "On Hold", "Lost", "Converted"],
      default: "New Lead",
      index: true,
    },

    lostReason: {
      type: String,
      default: "",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    nextFollowUpDate: {
      type: Date,
      default: null,
    },

    lastContactedAt: {
      type: Date,
      default: null,
    },

    // ---------------------------------------------
    // Follow-up / activity log
    // Every stage change and manually-added note lands here,
    // newest last, so LeadDetails can render it as a timeline.
    // ---------------------------------------------
    notes: [
      {
        text: { type: String, required: true },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Set once the lead converts — traces back to the Client
    // record it became.
    convertedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Lead", leadSchema);

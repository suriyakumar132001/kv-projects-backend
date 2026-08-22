// =========================================
// KV Projects ERP
// Lead Model (Sales & CRM pipeline)
//
// Field names/enums are matched exactly to what the existing
// frontend (LeadBoard.jsx, CreateLead.jsx, LeadDetails.jsx,
// leadService.js) already sends and expects back.
// =========================================

const mongoose = require("mongoose");

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
      lowercase: true,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    projectType: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      enum: [
        "Referral",
        "Website",
        "Site Visit",
        "Phone Enquiry",
        "Social Media",
        "Other",
      ],
      default: "Referral",
    },

    stage: {
      type: String,
      enum: ["New Lead", "Contacted", "On Hold", "Lost", "Converted"],
      default: "New Lead",
    },

    estimatedValue: {
      type: Number,
      default: 0,
      min: 0,
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

    lostReason: {
      type: String,
      default: "",
    },

    // Follow-up / activity notes, newest last.
    notes: [
      {
        text: { type: String, required: true },
        nextFollowUpDate: { type: Date, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Set once the lead is converted — links forward to the
    // Client record so history isn't lost.
    convertedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    convertedAt: {
      type: Date,
      default: null,
    },

    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Frequently filtered/sorted fields
leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ nextFollowUpDate: 1 });

module.exports = mongoose.model("Lead", leadSchema);

// ===============================================
// KV Projects ERP
// Lead Model (Sales & CRM pipeline)
// ===============================================

const mongoose = require("mongoose");

const STAGES = ["New Lead", "Contacted", "On Hold", "Lost", "Converted"];
const SOURCES = [
  "Referral",
  "Website",
  "Site Visit",
  "Phone Enquiry",
  "Social Media",
  "Other",
];

const leadSchema = new mongoose.Schema(
  {
    leadName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
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
      trim: true,
    },

    projectType: {
      type: String,
      default: "",
      trim: true,
    },

    source: {
      type: String,
      enum: SOURCES,
      default: "Referral",
    },

    estimatedValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    stage: {
      type: String,
      enum: STAGES,
      default: "New Lead",
    },

    // Set only when stage is moved to "Lost" — optional free-text reason
    // captured from the window.prompt() on the frontend.
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

    // Follow-up / activity timeline — appended to via POST /:id/notes,
    // rendered newest-first on the frontend.
    notes: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Set once the lead is converted — links to the Client record
    // created from it. Stage is also flipped to "Converted".
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

// ===============================================
// Indexes
// ===============================================

leadSchema.index({ stage: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ source: 1 });

leadSchema.statics.STAGES = STAGES;
leadSchema.statics.SOURCES = SOURCES;

module.exports = mongoose.model("Lead", leadSchema);

// =========================================
// KV Projects ERP
// Site Model
// =========================================

const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
    },

    projectName: {
      type: String,
      required: true,
    },

    clientName: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    siteEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    budget: {
      type: Number,
      default: 0,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    progress: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "Planning",
        "Started",
        "In Progress",
        "Completed",
        "On Hold",
      ],
      default: "Planning",
    },

    description: {
      type: String,
      default: "",
    },

    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Site", siteSchema);
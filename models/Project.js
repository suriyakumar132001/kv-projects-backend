// ===============================================
// KV Projects ERP
// Project Model
// ===============================================

const mongoose = require("mongoose");

// ===============================================
// Project Schema
// ===============================================

const projectSchema = new mongoose.Schema(
  {
    // =============================================
    // Basic Project Information
    // =============================================

    projectName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // =============================================
    // Project Manager
    // =============================================

    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =============================================
    // Project Dates
    // =============================================

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // =============================================
    // Financial Information
    // =============================================

    budget: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =============================================
    // Project Progress
    // =============================================

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // =============================================
    // Project Status
    // =============================================

    status: {
      type: String,
      enum: ["Pending", "Running", "Completed", "On Hold"],
      default: "Pending",
    },

    // =============================================
    // Site Reference
    // =============================================

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      default: null,
    },

    // =============================================
    // Created By
    // =============================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  // =============================================
  // Timestamps
  // =============================================

  {
    timestamps: true,
  },
);

// ===============================================
// Indexes
// ===============================================

projectSchema.index({
  projectName: 1,
});

projectSchema.index({
  clientName: 1,
});

projectSchema.index({
  status: 1,
});

projectSchema.index({
  createdAt: -1,
});

projectSchema.index({
  projectManager: 1,
});

// ===============================================
// Date Validation
// ===============================================

projectSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error("End date cannot be before start date."));
  }
});

// ===============================================
// Export Model
// ===============================================

module.exports = mongoose.model("Project", projectSchema);

// =========================================
// KV Projects ERP
// Labour Attendance Model
// =========================================

const mongoose = require("mongoose");

const labourSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    siteEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attendanceDate: {
      type: Date,
      default: Date.now,
    },

    mason: {
      type: Number,
      default: 0,
    },

    helper: {
      type: Number,
      default: 0,
    },

    carpenter: {
      type: Number,
      default: 0,
    },

    electrician: {
      type: Number,
      default: 0,
    },

    plumber: {
      type: Number,
      default: 0,
    },

    painter: {
      type: Number,
      default: 0,
    },

    totalLabours: {
      type: Number,
      default: 0,
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Labour", labourSchema);
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
      enum: ["Planning", "Started", "In Progress", "Completed", "On Hold"],
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

    // =============================================
    // GPS Geofence
    // =============================================
    //
    // latitude/longitude: the site's registered coordinates.
    // null until set by Owner/Admin — checkIn's verifyLocation()
    // relies on these being explicitly null (not just missing)
    // to correctly skip GPS verification for sites that haven't
    // been geo-tagged yet, instead of comparing against undefined.
    //
    // geofenceRadius: allowed distance in meters from the above
    // coordinates for a check-in to count as "on site". Defaults
    // to 200m if not set (see verifyLocation() fallback).
    // =============================================
    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    geofenceRadius: {
      type: Number,
      default: 200,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Site", siteSchema);

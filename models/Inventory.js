// =========================================
// KV Projects ERP
// Inventory Model
//
// One record per (site, materialName). Quantity is
// increased automatically whenever a GRN is recorded
// against that site/material, and will be decreased
// once Material Issues are wired up.
// =========================================

const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    materialName: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      default: "Nos",
    },

    quantity: {
      type: Number,
      default: 0,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// One stock row per site + material combination.
inventorySchema.index({ site: 1, materialName: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);

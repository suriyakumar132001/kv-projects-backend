// =========================================
// KV Projects ERP
// Inventory Model
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
    },

    unit: {
      type: String,
      default: "Nos",
    },

    availableStock: {
      type: Number,
      default: 0,
    },

    minimumStock: {
      type: Number,
      default: 50,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Inventory", inventorySchema);
// =========================================
// KV Projects ERP
// Goods Receipt Note (GRN) Model
//
// Records material actually received against a Purchase
// Order. A PO can have multiple GRNs (partial deliveries).
// Creating a GRN updates the parent PO's receivedQuantity
// and the site's Inventory stock.
// =========================================

const mongoose = require("mongoose");

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    // Denormalised from the PO at receipt time so GRN
    // records stay meaningful even if the PO changes later.
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

    quantityReceived: {
      type: Number,
      required: true,
    },

    condition: {
      type: String,
      enum: ["Good", "Damaged", "Partial Damage"],
      default: "Good",
    },

    notes: {
      type: String,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receivedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("GRN", grnSchema);

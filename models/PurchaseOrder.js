// =========================================
// KV Projects ERP
// Purchase Order Model
// =========================================

const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Set when this PO originated from an approved Material
    // Request (via the convert-to-PO flow). Null for POs
    // raised directly/manually.
    materialRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaterialRequest",
      default: null,
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    materialName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      default: "Nos",
    },

    unitPrice: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // Running total of quantity received against this PO,
    // kept in sync as GRNs are recorded.
    receivedQuantity: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Ordered", "Partially Received", "Received", "Cancelled"],
      default: "Ordered",
    },

    expectedDelivery: {
      type: Date,
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

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);

// =========================================
// KV Projects ERP
// Vendor Model
// =========================================

const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    materialType: {
      type: String,
      enum: [
        "Cement",
        "Steel",
        "Sand",
        "Bricks",
        "Electrical",
        "Plumbing",
        "Paint",
        "Machinery",
        "Other",
      ],
      default: "Other",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Vendor", vendorSchema);
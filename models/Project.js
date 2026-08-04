// =========================================
// KV Projects ERP
// Material Model
// =========================================

const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    materialName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Cement",
        "Steel",
        "Sand",
        "Bricks",
        "Jelly",
        "M-Sand",
        "Electrical",
        "Plumbing",
        "Paint",
        "Other",
      ],
      default: "Other",
    },

    unit: {
      type: String,
      enum: [
        "Bag",
        "Kg",
        "Ton",
        "Nos",
        "Feet",
        "Meter",
        "Litre",
        "CFT",
      ],
      default: "Nos",
    },

    quantity: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      default: 0,
    },

    supplier: {
      type: String,
      default: "",
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
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

module.exports = mongoose.model("Material", materialSchema);
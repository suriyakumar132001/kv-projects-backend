const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetName: {
      type: String,
      required: true,
      trim: true,
    },

    assetCode: {
      type: String,
      required: true,
      unique: true,
    },

    category: {
      type: String,
      enum: ["Machine", "Vehicle", "Tool", "Equipment"],
      required: true,
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },

    purchaseDate: {
      type: Date,
    },

    purchaseCost: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Available", "In Use", "Maintenance"],
      default: "Available",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Asset", assetSchema);
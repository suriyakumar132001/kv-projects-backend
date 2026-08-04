const mongoose = require("mongoose");

const materialIssueSchema = new mongoose.Schema(
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

    materialName: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      default: "Bag",
    },

    issuedFor: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MaterialIssue", materialIssueSchema);
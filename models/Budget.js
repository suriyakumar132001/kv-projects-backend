const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    materialBudget: {
      type: Number,
      default: 0,
    },

    labourBudget: {
      type: Number,
      default: 0,
    },

    equipmentBudget: {
      type: Number,
      default: 0,
    },

    miscellaneousBudget: {
      type: Number,
      default: 0,
    },

    totalBudget: {
      type: Number,
      required: true,
    },

    actualExpense: {
      type: Number,
      default: 0,
    },

    remainingBudget: {
      type: Number,
      default: 0,
    },

    utilizationPercentage: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["On Track", "Warning", "Over Budget"],
      default: "On Track",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Budget", budgetSchema);
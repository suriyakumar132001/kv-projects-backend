// =========================================
// KV Projects ERP
// Expense Model
// =========================================

const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
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

    category: {
      type: String,
      enum: [
        "Material",
        "Labour",
        "Transport",
        "Machinery",
        "Food",
        "Fuel",
        "Electrical",
        "Miscellaneous",
      ],
      default: "Miscellaneous",
    },

    amount: {
      type: Number,
      required: true,
    },

    vendorName: {
      type: String,
      default: "",
    },

    billNumber: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    expenseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Expense", expenseSchema);
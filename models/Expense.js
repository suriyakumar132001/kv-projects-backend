// ===============================================
// KV Projects ERP
// Expense Model
// ===============================================

const mongoose = require("mongoose");

// ===============================================
// Expense Schema
// ===============================================

const expenseSchema = new mongoose.Schema(
  {
    // ---------------------------------------------
    // Project
    // ---------------------------------------------

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    // ---------------------------------------------
    // Site
    // ---------------------------------------------

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },

    // ---------------------------------------------
    // Site Engineer
    // ---------------------------------------------

    siteEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ---------------------------------------------
    // Expense Category
    // ---------------------------------------------

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
      trim: true,
      index: true,
    },

    // ---------------------------------------------
    // Amount
    // ---------------------------------------------

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Expense amount must be greater than 0"],
    },

    // ---------------------------------------------
    // Vendor
    // ---------------------------------------------

    vendorName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    // ---------------------------------------------
    // Bill Number
    // ---------------------------------------------

    billNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    // ---------------------------------------------
    // Description
    // ---------------------------------------------

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // ---------------------------------------------
    // Expense Date
    // ---------------------------------------------

    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ===============================================
// Indexes
// ===============================================

expenseSchema.index({
  project: 1,
  expenseDate: -1,
});

expenseSchema.index({
  site: 1,
  expenseDate: -1,
});

expenseSchema.index({
  siteEngineer: 1,
  expenseDate: -1,
});

expenseSchema.index({
  category: 1,
  expenseDate: -1,
});

// ===============================================
// Virtual - Formatted Amount
// ===============================================

expenseSchema.virtual("formattedAmount").get(function () {
  return `₹${Number(this.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
});

// ===============================================
// JSON Settings
// ===============================================

expenseSchema.set("toJSON", {
  virtuals: true,
});

// ===============================================
// Export Model
// ===============================================

module.exports = mongoose.model("Expense", expenseSchema);

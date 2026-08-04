const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
    },

    projectName: {
      type: String,
      required: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
    },

    tax: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
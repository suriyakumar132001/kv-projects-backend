const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    projectName: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Lead", "Active", "Completed"],
      default: "Lead",
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

module.exports = mongoose.model("Client", clientSchema);
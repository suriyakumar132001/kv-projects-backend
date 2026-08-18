const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "Unassigned",
    },

    designation: {
      type: String,
      default: "Unassigned",
    },

    salary: {
      type: Number,
      default: 0,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    address: {
      type: String,
      default: "",
    },

    emergencyContact: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Links this Employee record to a login account (User) created via
    // the Owner/Admin "Add User" flow. Employees added manually by HR for
    // field workers who don't need a login will leave this unset.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },

    // =============================================
    // Face Recognition Enrollment
    // =============================================
    //
    // faceDescriptor: a 128-number vector produced by face-api.js
    // in the browser during enrollment (Add/Edit Employee — see
    // enrollFace in employeeController.js). At check-in, a fresh
    // descriptor is captured and compared against this one
    // server-side (attendanceController.js), the same way a
    // check-in's GPS coordinates are compared against a Site's.
    //
    // Only the descriptor is stored — not the enrollment photo —
    // to keep biometric data on file to the minimum needed for
    // matching. null until the employee is enrolled; re-enrolling
    // simply overwrites it.
    // =============================================
    faceDescriptor: {
      type: [Number],
      default: null,
    },

    faceEnrolledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Employee", employeeSchema);

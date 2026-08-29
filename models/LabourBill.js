// =========================================
// KV Projects ERP
// LabourBill Model
// A subcontractor "NMR" (Nominal Muster Roll) bill —
// bills a labour subcontractor for man-days supplied
// over a period, computed from daily in/out timesheets.
// =========================================

const mongoose = require("mongoose");

// One shift/time-block on one day. A single day can have several of
// these (e.g. day shift + night concreting shift), exactly like the
// original spreadsheet's multiple rows per date.
const timesheetRowSchema = new mongoose.Schema(
  {
    masonCount: { type: Number, default: 0 },
    helperCount: { type: Number, default: 0 },

    inTime: { type: String, default: "" }, // "08:00"
    outTime: { type: String, default: "" }, // "20:00"

    totalHours: { type: Number, default: 0 }, // outTime - inTime
    breakHours: { type: Number, default: 0 },
    netHours: { type: Number, default: 0 }, // totalHours - breakHours

    // Man-hours contributed by each trade in this shift —
    // NOT the same as netHours: it's headcount × netHours.
    masonManHours: { type: Number, default: 0 },
    helperManHours: { type: Number, default: 0 },

    remarks: { type: String, default: "" },
  },
  { _id: false },
);

const dailyEntrySchema = new mongoose.Schema(
  {
    slNo: { type: Number, required: true },
    date: { type: Date, required: true },
    rows: [timesheetRowSchema],
  },
  { _id: false },
);

// One line of the Abstract — one labour trade (Mason, Helper, Carpenter...)
const billItemSchema = new mongoose.Schema(
  {
    slNo: { type: Number, required: true },
    itemName: { type: String, required: true }, // "MASON"
    uom: { type: String, default: "M/days" },
    unitRate: { type: Number, required: true },
    previousBillQty: { type: Number, default: 0 },
    thisBillQty: { type: Number, default: 0 }, // man-days, server-computed
    billValue: { type: Number, default: 0 }, // thisBillQty * unitRate
    remarks: { type: String, default: "" },
  },
  { _id: false },
);

const labourBillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // The labour subcontractor being billed — reuses the Vendor
    // collection (add vendorType: "Labour Contractor" there) rather
    // than duplicating a whole new contacts module.
    subcontractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    scopeOfWork: {
      type: String,
      default: "NMR",
    },

    billPeriod: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },

    dailyEntries: [dailyEntrySchema],

    items: [billItemSchema],

    grandTotal: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Paid", "Rejected"],
      default: "Draft",
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LabourBill", labourBillSchema);

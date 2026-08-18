const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    attendanceDate: {
      type: Date,
      default: Date.now,
    },

    checkIn: {
      type: Date,
    },

    checkOut: {
      type: Date,
    },

    workingHours: {
      type: Number,
      default: 0,
    },

    overtimeHours: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Leave"],
      default: "Present",
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },

    remarks: {
      type: String,
      default: "",
    },

    // =============================================
    // GPS Verification
    // =============================================
    //
    // checkInLocation / checkOutLocation: raw coordinates
    // the browser reported at that moment, kept regardless
    // of verification result — useful for audit even if
    // outside the geofence.
    //
    // distanceFromSite: computed distance (meters) between
    // checkInLocation and the site's registered coordinates.
    // null if the site has no coordinates set.
    //
    // locationVerified: true = within geofenceRadius,
    // false = outside it (flagged, not blocked — see
    // attendanceController.js checkIn), null = could not
    // be checked (no site coordinates, or browser denied
    // location access).
    // =============================================
    checkInLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    checkOutLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },

    distanceFromSite: {
      type: Number,
      default: null,
    },

    locationVerified: {
      type: Boolean,
      default: null,
    },

    // =============================================
    // Face Verification
    // =============================================
    //
    // A face descriptor is captured in the browser at check-in
    // time (face-api.js) and compared server-side against the
    // employee's enrolled descriptor (Employee.faceDescriptor).
    // The raw descriptor captured at check-in is NOT stored here
    // — only the computed result — to avoid keeping biometric
    // vectors around once the comparison is done.
    //
    // faceDistance: Euclidean distance between the check-in
    // descriptor and the enrolled one. Lower = more similar.
    //
    // faceVerified: true = within FACE_MATCH_THRESHOLD (see
    // attendanceController.js), false = outside it (flagged,
    // not blocked — same philosophy as locationVerified), null
    // = could not be checked (employee not enrolled yet, or no
    // face was captured/detected at check-in).
    // =============================================
    faceDistance: {
      type: Number,
      default: null,
    },

    faceVerified: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Attendance", attendanceSchema);

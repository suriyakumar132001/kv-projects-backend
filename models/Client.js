const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

    // =============================================
    // Client Portal Access
    // =============================================
    //
    // Not every client has portal access — only clients
    // an Owner/Admin has explicitly activated. password
    // stays undefined until then, and login is blocked
    // unless portalActive is true, even if a password
    // somehow exists (e.g. after being deactivated).
    // =============================================

    password: {
      type: String,
      minlength: 6,
      default: undefined,
    },

    portalActive: {
      type: Boolean,
      default: false,
    },

    lastPortalLogin: {
      type: Date,
      default: null,
    },

    // Forgot Password — same hashed-token + expiry pattern
    // used on User.js, so a leaked database alone can't be
    // used to reset a client's password.
    resetPasswordToken: {
      type: String,
      default: undefined,
    },

    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================
// Hash Password (only runs when a password exists
// and was actually changed — most clients never set
// one at all)
// =============================================

clientSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// =============================================
// Compare Password
// =============================================

clientSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;

  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Client", clientSchema);
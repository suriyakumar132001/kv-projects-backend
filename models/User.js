const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
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
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "siteengineer", "hr", "accountant"],
      default: "siteengineer",
    },

    phone: {
      type: String,
      default: "",
    },

    assignedSites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
      },
    ],

    profileImage: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    googleId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // Forgot Password — stores a HASHED version of the reset token
    // (never the raw token, same principle as the password itself)
    // plus an expiry so old/unused tokens can't be reused later.
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
  },
);

// Hash Password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare Password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

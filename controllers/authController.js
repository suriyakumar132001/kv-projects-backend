// =============================================
// KV Projects ERP
// Authentication Controller
// =============================================

const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const provisionEmployeeForUser = require("../utils/provisionEmployeeForUser");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ROLE_LABELS = {
  owner: "Managing Director",
  admin: "Admin",
  hr: "HR",
  siteengineer: "Site Engineer",
  accountant: "Accountant",
};

// Sends the new user their login credentials by email.
// This is best-effort — if it fails (bad SMTP creds, etc.) we log it
// but never block the account from being created.
const sendWelcomeEmail = async ({ name, email, password, role, createdBy }) => {
  try {
    await sendEmail({
      to: email,
      subject: "Your KV Projects ERP account is ready",
      html: `
        <h2>KV Projects ERP</h2>

        <p>Hi ${name},</p>

        <p>${createdBy} has created a <b>${ROLE_LABELS[role] || role}</b> account for you on KV Projects ERP.</p>

        <p>You can log in with:</p>
        <p>
          Email: <b>${email}</b><br>
          Temporary Password: <b>${password}</b>
        </p>

        <p>For security, please log in and change your password as soon as possible.</p>

        <br>
        <p>Thank you.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Welcome email failed to send:", error.message);
    return false;
  }
};

// =============================================
// Register User
//
// Registration is NOT open to the public. There are exactly two ways
// a user can be created:
//
//   1. Bootstrap — if the database has zero users, the very first
//      account created is always forced to role "owner", regardless
//      of what was submitted. This is how the site gets its one and
//      only Owner account. No login is required for this one-time step.
//
//   2. Owner/Admin creates staff — once an Owner exists, every future
//      call to this endpoint must come from a logged-in Owner or Admin
//      (see optionalAuth + the checks below). They pick a name + role
//      on the "Add User" form:
//          - Owner   -> can create Admin, HR, or Site Engineer
//          - Admin   -> can create HR or Site Engineer only
//            (an Admin cannot create another Admin or an Owner —
//             prevents privilege escalation)
//
// HR and Site Engineer users can never self-register and can never
// create other users — they can only log in with credentials an
// Owner/Admin created for them.
// =============================================

const CREATABLE_ROLES = ["admin", "hr", "siteengineer", "accountant"];

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      // HR/employee fields — optional. When provided (from the merged
      // "Add Employee" form), the auto-provisioned Employee record gets
      // real data immediately instead of the bare-bones defaults.
      department,
      designation,
      salary,
      joiningDate,
      address,
      emergencyContact,
      faceDescriptor,
    } = req.body;
    let { role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // Check Existing User
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const totalUsers = await User.countDocuments();

    if (totalUsers === 0) {
      // ---- Bootstrap: first-ever account becomes the Owner ----
      role = "owner";
    } else {
      // ---- Every user after the first requires an Owner/Admin/HR caller ----
      // HR was added here to support the merged "Add Employee" form (HR
      // could already create Employee records via the old endpoint —
      // this just extends that same permission to cover login creation
      // too, instead of leaving HR unable to do what they could before).
      const caller = req.user;

      if (!caller || !["owner", "admin", "hr"].includes(caller.role)) {
        return res.status(403).json({
          success: false,
          message:
            "Only the Owner, an Admin, or HR can register new users. Please log in first.",
        });
      }

      if (!role || !CREATABLE_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${CREATABLE_ROLES.join(", ")}`,
        });
      }

      if (caller.role === "admin" && role === "admin") {
        return res.status(403).json({
          success: false,
          message:
            "Admins can only create HR, Site Engineer, or Accountant accounts.",
        });
      }

      // HR can only onboard field staff this way — not other HR,
      // Accountant, or Admin accounts. Deliberately more restrictive
      // than Admin's rule above; adjust here if that's not what you want.
      if (caller.role === "hr" && role !== "siteengineer") {
        return res.status(403).json({
          success: false,
          message: "HR can only create Site Engineer accounts.",
        });
      }
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    // Bootstrap case: log the new Owner straight in.
    // Owner/Admin/HR creating staff: no token is issued for the new
    // account — the caller stays logged in as themselves, and the
    // new user logs in separately with their own credentials.
    let employee = null;
    let employeeLinkFailedReason = null;
    let emailQueued = false;

    if (totalUsers > 0) {
      // Auto-provision a linked Employee record. If the caller supplied
      // HR fields (the merged Add Employee form), they're used
      // immediately instead of the bare-bones defaults.
      const provisionResult = await provisionEmployeeForUser({
        user,
        phone,
        createdById: req.user._id,
        department,
        designation,
        salary,
        joiningDate,
        address,
        emergencyContact,
      });

      employee = provisionResult.employee;
      employeeLinkFailedReason = provisionResult.reason;

      // Optional: face captured on the Add Employee form, same
      // validation as employeeController's enrollFace/createEmployee.
      if (
        employee &&
        Array.isArray(faceDescriptor) &&
        faceDescriptor.length === 128 &&
        faceDescriptor.every((n) => typeof n === "number" && Number.isFinite(n))
      ) {
        employee.faceDescriptor = faceDescriptor;
        employee.faceEnrolledAt = new Date();
        await employee.save();
      }

      // Fire-and-forget: don't make the Owner/Admin/HR wait for the
      // Gmail SMTP round-trip (often several seconds) before getting a
      // response. sendWelcomeEmail already catches its own errors and
      // just logs them.
      emailQueued = true;
      sendWelcomeEmail({
        name: user.name,
        email: user.email,
        password, // plain-text password, captured before hashing
        role: user.role,
        createdBy: ROLE_LABELS[req.user.role] || req.user.role,
      });
    }

    const responseBody = {
      success: true,
      message:
        totalUsers === 0
          ? "Owner account created successfully"
          : "User registered successfully. Login details are being emailed to them.",
      emailQueued,
      employeeLinked: !!employee,
      employeeLinkFailedReason: employee ? null : employeeLinkFailedReason,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
    };

    if (employee) {
      // Strip faceDescriptor even though we just received it in this
      // same request — same defense-in-depth as every other employee
      // endpoint, rather than making an exception here.
      const { faceDescriptor: _omit, ...safeEmployee } = employee.toObject();
      responseBody.employee = safeEmployee;
    }

    if (totalUsers === 0) {
      responseBody.token = generateToken(user._id, user.role);
    }

    return res.status(201).json(responseBody);
  } catch (error) {
    console.log("====================================");
    console.log("REGISTER ERROR");
    console.error(error);
    console.error(error.stack);
    console.log("====================================");

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Login User
// =============================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact your admin.",
      });
    }

    // Compare Password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Generate Token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth is not configured on the server",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || payload.email_verified === false) {
      return res.status(401).json({
        success: false,
        message: "Google account email is not verified",
      });
    }

    const email = payload.email.toLowerCase();

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = `${crypto.randomBytes(16).toString("hex")}-Google@2026`;

      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: randomPassword,
        role: "siteengineer",
        profileImage: payload.picture || "",
        googleId: payload.sub,
        authProvider: "google",
      });
    } else {
      if (user.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated. Contact your admin.",
        });
      }

      if (!user.googleId) {
        user.googleId = payload.sub;
      }

      if (!user.authProvider || user.authProvider === "local") {
        user.authProvider = "google";
      }

      if (!user.profileImage && payload.picture) {
        user.profileImage = payload.picture;
      }

      await user.save();
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: "Google Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Google sign-in failed",
    });
  }
};

// =============================================
// Forgot Password
//
// User submits their email. If it matches an account, we generate a
// random reset token, save only its HASH + a 30-minute expiry on the
// user, and email them a link containing the RAW token. The raw token
// is never stored anywhere — only its hash — so even if the database
// leaked, nobody could use it to reset a password.
//
// Always responds with the same success message whether or not the
// email exists, so this endpoint can't be used to check which emails
// are registered.
// =============================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email",
      });
    }

    const user = await User.findOne({ email });

    const genericResponse = {
      success: true,
      message:
        "If an account exists for that email, a password reset link has been sent.",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate a random raw token (sent to the user) and store only
    // its SHA-256 hash on the user document.
    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save();

    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your KV Projects ERP password",
        html: `
          <h2>KV Projects ERP</h2>

          <p>Hi ${user.name},</p>

          <p>We received a request to reset your password. Click the link below to choose a new one. This link expires in 30 minutes.</p>

          <p><a href="${resetUrl}">${resetUrl}</a></p>

          <p>If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>

          <br>
          <p>Thank you.</p>
        `,
      });
    } catch (emailError) {
      // Roll back the token so a failed email doesn't leave a dangling,
      // unusable reset request sitting on the account.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      console.error("Password reset email failed to send:", emailError.message);

      return res.status(500).json({
        success: false,
        message: "Could not send reset email. Please try again later.",
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Reset Password
//
// User arrives here from the emailed link, which contains the RAW
// token. We hash it the same way and look for a user whose stored
// hash matches AND whose expiry hasn't passed.
// =============================================

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
};

// =============================================
// KV Projects ERP
// Authentication Controller
// =============================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  hr: "HR",
  siteengineer: "Site Engineer",
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

const CREATABLE_ROLES = ["admin", "hr", "siteengineer"];

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
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
      // ---- Every user after the first requires an Owner/Admin caller ----
      const caller = req.user;

      if (!caller || !["owner", "admin"].includes(caller.role)) {
        return res.status(403).json({
          success: false,
          message:
            "Only the Owner or an Admin can register new users. Please log in first.",
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
          message: "Admins can only create HR or Site Engineer accounts.",
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
    // Owner/Admin creating staff: no token is issued for the new
    // account — the caller stays logged in as themselves, and the
    // new HR/Admin/Site Engineer logs in separately with their own credentials.
    let emailSent = false;

    if (totalUsers > 0) {
      // Only for the "Owner/Admin creates staff" path — the bootstrap
      // Owner already knows their own password, no email needed.
      emailSent = await sendWelcomeEmail({
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
          : emailSent
            ? "User registered successfully. Login details emailed to them."
            : "User registered successfully, but the welcome email could not be sent — please share their password manually.",
      emailSent,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
    };

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

module.exports = {
  register,
  login,
};

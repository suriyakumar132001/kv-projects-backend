// =======================================
// KV Projects ERP
// User Controller
// =======================================

const User = require("../models/User");
const Employee = require("../models/Employee");
const provisionEmployeeForUser = require("../utils/provisionEmployeeForUser");

// =======================================
// Get All Users
// =======================================

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    // Flag which users already have a linked Employee profile, so the
    // frontend can offer a "Create Employee Profile" button for the ones
    // that don't (older accounts created before this feature existed).
    const linkedEmployees = await Employee.find({
      user: { $in: users.map((u) => u._id) },
    }).select("user employeeId");

    const linkedByUserId = new Map(
      linkedEmployees.map((e) => [String(e.user), e.employeeId]),
    );

    const usersWithLinkStatus = users.map((u) => ({
      ...u,
      employeeLinked: linkedByUserId.has(String(u._id)),
      employeeId: linkedByUserId.get(String(u._id)) || null,
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      users: usersWithLinkStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================================
// Get User By ID
// =======================================

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================================
// Update My Profile
// =======================================

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================================
// Change My Password
// =======================================

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password Changed Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================================
// Activate / Deactivate a User
// (Owner & Admin only — see userRoutes.js)
// =======================================

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Active' or 'Inactive'",
      });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Nobody can deactivate the Owner account, and Admins can't touch
    // other Admins — only the Owner manages Admin accounts.
    if (targetUser.role === "owner") {
      return res.status(403).json({
        success: false,
        message: "The Owner account cannot be deactivated.",
      });
    }

    if (req.user.role === "admin" && targetUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the Owner can manage Admin accounts.",
      });
    }

    targetUser.status = status;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User ${status === "Active" ? "activated" : "deactivated"} successfully`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================================
// Create/Link an Employee profile for an EXISTING user
// (Owner & Admin only — for accounts created before the
//  auto-link-on-registration feature existed)
// =======================================

const provisionEmployee = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.role === "owner") {
      return res.status(400).json({
        success: false,
        message: "The Owner account doesn't need an Employee profile.",
      });
    }

    const existing = await Employee.findOne({ user: targetUser._id });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This user already has a linked Employee profile.",
        employee: existing,
      });
    }

    const employee = await provisionEmployeeForUser({
      user: targetUser,
      phone: targetUser.phone,
      createdById: req.user._id,
    });

    if (!employee) {
      return res.status(500).json({
        success: false,
        message:
          "Could not create an Employee profile — check server logs (a duplicate email in Employees is the most common cause).",
      });
    }

    res.status(201).json({
      success: true,
      message: "Employee profile created and linked successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateProfile,
  changePassword,
  updateUserStatus,
  provisionEmployee,
};

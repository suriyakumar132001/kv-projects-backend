const Leave = require("../models/Leave");
const Employee = require("../models/Employee");

const MANAGEMENT_ROLES = ["owner", "admin", "hr"];

// =====================================
// Apply Leave
// =====================================

const applyLeave = async (req, res) => {
  try {
    let employeeId = req.body.employee;

    // Non-management roles can only apply for themselves, regardless
    // of what "employee" was sent in the request body.
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      const ownEmployee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email?.toLowerCase() }],
      });

      if (!ownEmployee) {
        return res.status(404).json({
          success: false,
          message:
            "No employee record is linked to your account. Contact HR/Admin.",
        });
      }

      employeeId = ownEmployee._id;
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const leave = await Leave.create({
      ...req.body,
      employee: employeeId,
    });

    res.status(201).json({
      success: true,
      message: "Leave Applied Successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get All Leaves
// Search + Filter + Pagination
// =====================================

const getLeaves = async (req, res) => {
  try {
    const { search, status, leaveType, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (leaveType) {
      query.leaveType = leaveType;
    }

    // Non-management roles only ever see their own leave records.
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      const ownEmployee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email?.toLowerCase() }],
      });

      if (!ownEmployee) {
        return res.status(200).json({
          success: true,
          total: 0,
          page: Number(page),
          pages: 0,
          count: 0,
          leaves: [],
        });
      }

      query.employee = ownEmployee._id;
    }

    let leaves = await Leave.find(query)
      .populate("employee", "employeeId name department")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    if (search) {
      leaves = leaves.filter((leave) =>
        leave.employee?.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = leaves.length;

    const start = (page - 1) * limit;

    const end = start + Number(limit);

    leaves = leaves.slice(start, end);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      count: leaves.length,
      leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get Single Leave
// =====================================

const getLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate("employee", "employeeId name department")
      .populate("approvedBy", "name email");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // Non-management roles can only view their own leave records.
    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      const ownEmployee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email?.toLowerCase() }],
      });

      if (
        !ownEmployee ||
        String(leave.employee?._id) !== String(ownEmployee._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this leave record",
        });
      }
    }

    res.status(200).json({
      success: true,
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Leave
// =====================================

const updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Leave Updated Successfully",
      leave: updatedLeave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Delete Leave
// =====================================

const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    await leave.deleteOne();

    res.status(200).json({
      success: true,
      message: "Leave Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Approve Leave
// =====================================

const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    leave.status = "Approved";
    leave.approvedBy = req.user._id;
    leave.remarks = req.body.remarks || "";

    await leave.save();

    res.status(200).json({
      success: true,
      message: "Leave Approved Successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Reject Leave
// =====================================

const rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    leave.status = "Rejected";
    leave.approvedBy = req.user._id;
    leave.remarks = req.body.remarks || "";

    await leave.save();

    res.status(200).json({
      success: true,
      message: "Leave Rejected Successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  applyLeave,
  getLeaves,
  getLeave,
  updateLeave,
  deleteLeave,
  approveLeave,
  rejectLeave,
};

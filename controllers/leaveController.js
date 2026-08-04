const Leave = require("../models/Leave");
const Employee = require("../models/Employee");

// =====================================
// Apply Leave
// =====================================

const applyLeave = async (req, res) => {
  try {

    const employee = await Employee.findById(req.body.employee);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const leave = await Leave.create(req.body);

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
// =====================================

const getLeaves = async (req, res) => {

  try {

    const leaves = await Leave.find()
      .populate("employee", "employeeId name department")
      .populate("approvedBy", "name");

    res.status(200).json({
      success: true,
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

module.exports = {
 applyLeave,
  getLeaves,
  getLeave,
  approveLeave,
  rejectLeave
};
// =============================================
// KV Projects ERP
// Employee Self-Service (ESS) Controller
// =============================================
//
// Every route here resolves the calling user's OWN Employee record via
// Employee.user (set at account creation — see provisionEmployeeForUser.js)
// and never accepts an employee id from the request. That's the whole
// point of ESS: there is no way to view or edit anyone else's data
// through these endpoints, regardless of role.

const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

// Fields an employee may edit about themselves. Salary, department,
// designation, status, employeeId etc. stay HR/Admin-only (via the
// existing Employees page) — deliberately not editable here.
const SELF_EDITABLE_FIELDS = ["phone", "address", "emergencyContact"];

const findOwnEmployee = (userId) => Employee.findOne({ user: userId });

// =============================================
// PUT /api/ess/profile
// Employee updates their own contact details only.
// (Reading your own profile already exists at GET /employees/me —
// this only adds the write side, which didn't exist before.)
// =============================================

const updateMyProfile = async (req, res) => {
  try {
    const employee = await findOwnEmployee(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "No employee record is linked to your account. Contact HR/Admin.",
      });
    }

    SELF_EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// GET /api/ess/payslips
// =============================================

const getMyPayslips = async (req, res) => {
  try {
    const employee = await findOwnEmployee(req.user._id);

    if (!employee) {
      return res.status(200).json({
        success: true,
        count: 0,
        payslips: [],
      });
    }

    const payslips = await Payroll.find({ employee: employee._id }).sort({
      year: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: payslips.length,
      payslips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// GET /api/ess/payslips/:id
// =============================================

const getMyPayslip = async (req, res) => {
  try {
    const employee = await findOwnEmployee(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No employee record linked to your account.",
      });
    }

    const payslip = await Payroll.findById(req.params.id)
      .populate("employee", "employeeId name department designation")
      .populate("createdBy", "name");

    if (!payslip || String(payslip.employee._id) !== String(employee._id)) {
      // Same 404 whether it doesn't exist or belongs to someone else —
      // never reveal that a different employee's payslip id is valid.
      return res.status(404).json({
        success: false,
        message: "Payslip not found",
      });
    }

    res.status(200).json({
      success: true,
      payslip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// GET /api/ess/summary
// Quick-glance dashboard: latest payslip, this month's attendance
// count, and pending leave count — all scoped to the caller.
// =============================================

const getMySummary = async (req, res) => {
  try {
    const employee = await findOwnEmployee(req.user._id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No employee record linked to your account.",
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [latestPayslip, attendanceThisMonth, pendingLeaves] =
      await Promise.all([
        Payroll.findOne({ employee: employee._id }).sort({
          year: -1,
          createdAt: -1,
        }),
        Attendance.countDocuments({
          employee: employee._id,
          attendanceDate: { $gte: monthStart },
        }),
        Leave.countDocuments({
          employee: employee._id,
          status: "Pending",
        }),
      ]);

    res.status(200).json({
      success: true,
      summary: {
        employee: {
          name: employee.name,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.designation,
          phone: employee.phone,
          address: employee.address,
          emergencyContact: employee.emergencyContact,
        },
        latestPayslip,
        attendanceThisMonth,
        pendingLeaves,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  updateMyProfile,
  getMyPayslips,
  getMyPayslip,
  getMySummary,
};

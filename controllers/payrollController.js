const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const sendWhatsApp = require("../utils/sendWhatsApp");
const calculateAttendanceSummary = require("../utils/calculateAttendanceSummary");

// =====================================
// Generate Payroll
// =====================================

const getAttendanceSummary = async (req, res) => {
  try {
    const { employee, month, year } = req.query;

    if (!employee || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "employee, month, and year are required",
      });
    }

    const summary = await calculateAttendanceSummary({
      employeeId: employee,
      month,
      year,
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

const createPayroll = async (req, res) => {
  try {
    const {
      employee,
      month,
      year,
      basicSalary,
      hra,
      allowance,
      overtime,
      overtimeHours,
      bonus,
      pf,
      esi,
      professionalTax,
      daysInMonth,
      daysPresent,
      daysOnApprovedLeave,
      daysAbsent,
      perDaySalary,
      lopDeduction,
    } = req.body;

    const employeeExists = await Employee.findById(employee);

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const totalEarnings =
      Number(basicSalary) +
      Number(hra) +
      Number(allowance) +
      Number(overtime) +
      Number(bonus);

    const computedLopDeduction = Number(lopDeduction || 0);

    const totalDeductions =
      Number(pf) +
      Number(esi) +
      Number(professionalTax) +
      computedLopDeduction;

    const netSalary = totalEarnings - totalDeductions;

    const payroll = await Payroll.create({
      employee,
      month,
      year,
      basicSalary,
      hra,
      allowance,
      overtime: Number(overtime || 0),
      overtimeHours: Number(overtimeHours || 0),
      bonus,
      pf,
      esi,
      professionalTax,
      daysInMonth: Number(daysInMonth || 0),
      daysPresent: Number(daysPresent || 0),
      daysOnApprovedLeave: Number(daysOnApprovedLeave || 0),
      daysAbsent: Number(daysAbsent || 0),
      perDaySalary: Number(perDaySalary || 0),
      lopDeduction: computedLopDeduction,
      totalEarnings,
      totalDeductions,
      netSalary,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Payroll Generated Successfully",
      payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get All Payrolls
// =====================================

const getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find()
      .populate("employee", "employeeId name department designation")
      .populate("createdBy", "name");

    res.status(200).json({
      success: true,
      count: payrolls.length,
      payrolls,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get Single Payroll
// =====================================

const getPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate("employee")
      .populate("createdBy", "name");

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    res.status(200).json({
      success: true,
      payroll,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Payroll
// =====================================

const updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    // Merge incoming fields with existing values so partial updates
    // still compute correct totals.
    const basicSalary = req.body.basicSalary ?? payroll.basicSalary;
    const hra = req.body.hra ?? payroll.hra;
    const allowance = req.body.allowance ?? payroll.allowance;
    const overtime = req.body.overtime ?? payroll.overtime ?? 0;
    const overtimeHours = req.body.overtimeHours ?? payroll.overtimeHours ?? 0;
    const bonus = req.body.bonus ?? payroll.bonus;

    const pf = req.body.pf ?? payroll.pf;
    const esi = req.body.esi ?? payroll.esi;
    const professionalTax = req.body.professionalTax ?? payroll.professionalTax;
    const daysInMonth = req.body.daysInMonth ?? payroll.daysInMonth ?? 0;
    const daysPresent = req.body.daysPresent ?? payroll.daysPresent ?? 0;
    const daysOnApprovedLeave = req.body.daysOnApprovedLeave ?? payroll.daysOnApprovedLeave ?? 0;
    const daysAbsent = req.body.daysAbsent ?? payroll.daysAbsent ?? 0;
    const perDaySalary = req.body.perDaySalary ?? payroll.perDaySalary ?? 0;
    const lopDeduction = req.body.lopDeduction ?? payroll.lopDeduction ?? 0;

    const totalEarnings =
      Number(basicSalary) +
      Number(hra) +
      Number(allowance) +
      Number(overtime) +
      Number(bonus);

    const totalDeductions =
      Number(pf) +
      Number(esi) +
      Number(professionalTax) +
      Number(lopDeduction);

    const netSalary = totalEarnings - totalDeductions;

    // Never trust totals sent by the client — always recompute server-side.
    const updateData = {
      ...req.body,
      basicSalary,
      hra,
      allowance,
      overtime: Number(overtime || 0),
      overtimeHours: Number(overtimeHours || 0),
      bonus,
      pf,
      esi,
      professionalTax,
      daysInMonth: Number(daysInMonth || 0),
      daysPresent: Number(daysPresent || 0),
      daysOnApprovedLeave: Number(daysOnApprovedLeave || 0),
      daysAbsent: Number(daysAbsent || 0),
      perDaySalary: Number(perDaySalary || 0),
      lopDeduction: Number(lopDeduction || 0),
      totalEarnings,
      totalDeductions,
      netSalary,
    };

    const updated = await Payroll.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Payroll Updated Successfully",
      payroll: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Mark Salary Paid
// =====================================

const markAsPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    payroll.paymentStatus = "Paid";

    await payroll.save();

    res.status(200).json({
      success: true,
      message: "Salary Marked as Paid",
      payroll,
    });

    // Fire-and-forget: never block or fail this response on WhatsApp delivery.
    const employee = await Employee.findById(payroll.employee);
    if (employee?.phone) {
      sendWhatsApp({
        to: employee.phone,
        body: `Hi ${employee.name}, your salary of ₹${payroll.netSalary} for ${payroll.month} ${payroll.year} has been credited. — KV Projects`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Delete Payroll
// =====================================

const deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    await payroll.deleteOne();

    res.status(200).json({
      success: true,
      message: "Payroll Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAttendanceSummary,
  createPayroll,
  getPayrolls,
  getPayroll,
  updatePayroll,
  markAsPaid,
  deletePayroll,
};

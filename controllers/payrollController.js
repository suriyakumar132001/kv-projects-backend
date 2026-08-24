const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const sendWhatsApp = require("../utils/sendWhatsApp");

// =====================================
// Generate Payroll
// =====================================

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
      bonus,
      pf,
      esi,
      professionalTax,
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

    const totalDeductions = Number(pf) + Number(esi) + Number(professionalTax);

    const netSalary = totalEarnings - totalDeductions;

    const payroll = await Payroll.create({
      employee,
      month,
      year,
      basicSalary,
      hra,
      allowance,
      overtime,
      bonus,
      pf,
      esi,
      professionalTax,
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
    const overtime = req.body.overtime ?? payroll.overtime;
    const bonus = req.body.bonus ?? payroll.bonus;

    const pf = req.body.pf ?? payroll.pf;
    const esi = req.body.esi ?? payroll.esi;
    const professionalTax = req.body.professionalTax ?? payroll.professionalTax;

    const totalEarnings =
      Number(basicSalary) +
      Number(hra) +
      Number(allowance) +
      Number(overtime) +
      Number(bonus);

    const totalDeductions = Number(pf) + Number(esi) + Number(professionalTax);

    const netSalary = totalEarnings - totalDeductions;

    // Never trust totals sent by the client — always recompute server-side.
    const updateData = {
      ...req.body,
      basicSalary,
      hra,
      allowance,
      overtime,
      bonus,
      pf,
      esi,
      professionalTax,
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
  createPayroll,
  getPayrolls,
  getPayroll,
  updatePayroll,
  markAsPaid,
  deletePayroll,
};

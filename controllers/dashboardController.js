// =========================================
// KV Projects ERP
// Dashboard Controller
// =========================================

const Employee = require("../models/Employee");
const Project = require("../models/Project");
const Attendance = require("../models/Attendance");
const Invoice = require("../models/Invoice");

// Reusable stats builder
const getStats = async () => {
  const employees = await Employee.countDocuments();
  const projects = await Project.countDocuments();

  // Today's attendance count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const attendance = await Attendance.countDocuments({
    attendanceDate: { $gte: todayStart, $lte: todayEnd },
  });

  const reportsToday = await require("../models/DPR").countDocuments({
    reportDate: { $gte: todayStart, $lte: todayEnd },
  });

  // Total revenue from Paid invoices
  const revenueResult = await Invoice.aggregate([
    { $match: { paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } },
  ]);

  const revenue = revenueResult[0]?.total || 0;

  return { employees, projects, attendance, reportsToday, revenue };
};

const ownerDashboard = async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      success: true,
      message: "Welcome Owner",
      user: req.user,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

const adminDashboard = async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

const hrDashboard = async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      success: true,
      message: "Welcome HR",
      user: req.user,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

const siteEngineerDashboard = async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      success: true,
      message: "Welcome Site Engineer",
      user: req.user,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

const accountantDashboard = async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      success: true,
      message: "Welcome Accountant",
      user: req.user,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load dashboard" });
  }
};

module.exports = {
  ownerDashboard,
  adminDashboard,
  hrDashboard,
  siteEngineerDashboard,
  accountantDashboard,
};
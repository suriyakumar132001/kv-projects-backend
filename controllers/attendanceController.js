const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// Looks up the Employee record linked to a logged-in user (used to lock
// Site Engineers to their own attendance only).
const findOwnEmployee = async (userId) => {
  return Employee.findOne({ user: userId });
};

// ======================================
// Employee Check In
// ======================================
const checkIn = async (req, res) => {
  try {
    let employeeId = req.body.employee;

    // Site Engineers can only ever check themselves in — the employee
    // they're linked to, never anyone chosen from a dropdown/body param.
    if (req.user.role === "siteengineer") {
      const myEmployee = await findOwnEmployee(req.user._id);

      if (!myEmployee) {
        return res.status(400).json({
          success: false,
          message:
            "No employee profile is linked to your account yet. Contact your Admin/Owner.",
        });
      }

      employeeId = myEmployee._id;
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      checkIn: new Date(),
      remarks: req.body.remarks,
    });

    res.status(201).json({
      success: true,
      message: "Check In Successful",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Employee Check Out
// ======================================
const checkOut = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    // Site Engineers can only check themselves out.
    if (req.user.role === "siteengineer") {
      const myEmployee = await findOwnEmployee(req.user._id);

      if (
        !myEmployee ||
        String(attendance.employee) !== String(myEmployee._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only check out your own attendance.",
        });
      }
    }

    attendance.checkOut = new Date();

    const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);

    attendance.workingHours = Number(hours.toFixed(2));

    if (hours > 8) {
      attendance.overtimeHours = Number((hours - 8).toFixed(2));
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check Out Successful",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get All Attendance
// ======================================
const getAttendance = async (req, res) => {
  try {
    const query = {};

    // Site Engineers only ever see their own attendance history.
    if (req.user.role === "siteengineer") {
      const myEmployee = await findOwnEmployee(req.user._id);

      if (!myEmployee) {
        return res.status(200).json({
          success: true,
          count: 0,
          attendance: [],
        });
      }

      query.employee = myEmployee._id;
    }

    const attendance = await Attendance.find(query)
      .populate("employee", "employeeId name department")
      .sort({ attendanceDate: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Get Single Attendance
// ======================================
const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate(
      "employee",
      "employeeId name department",
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    // Site Engineers can only view their own attendance records.
    if (req.user.role === "siteengineer") {
      const myEmployee = await findOwnEmployee(req.user._id);

      if (
        !myEmployee ||
        String(attendance.employee._id) !== String(myEmployee._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own attendance.",
        });
      }
    }

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceById,
};

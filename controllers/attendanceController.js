const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// ======================================
// Employee Check In
// ======================================

const checkIn = async (req, res) => {
  try {

    const employee = await Employee.findById(req.body.employee);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const attendance = await Attendance.create({
      employee: req.body.employee,
      checkIn: new Date(),
      remarks: req.body.remarks
    });

    res.status(201).json({
      success: true,
      message: "Check In Successful",
      attendance
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
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
        message: "Attendance not found"
      });
    }

    attendance.checkOut = new Date();

    const hours =
      (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);

    attendance.workingHours = Number(hours.toFixed(2));

    if (hours > 8) {
      attendance.overtimeHours = Number((hours - 8).toFixed(2));
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Check Out Successful",
      attendance
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// ======================================
// Get Attendance
// ======================================

const getAttendance = async (req, res) => {

  try {

    const attendance = await Attendance.find()
      .populate("employee", "employeeId name department");

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

module.exports = {
  checkIn,
  checkOut,
  getAttendance
};
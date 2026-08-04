const Labour = require("../models/Labour");

// Create Attendance
const createAttendance = async (req, res) => {
  try {
    const {
      site,
      mason,
      helper,
      carpenter,
      electrician,
      plumber,
      painter,
      remarks,
    } = req.body;

    const totalLabours =
      Number(mason) +
      Number(helper) +
      Number(carpenter) +
      Number(electrician) +
      Number(plumber) +
      Number(painter);

    const attendance = await Labour.create({
      site,
      siteEngineer: req.user._id,
      mason,
      helper,
      carpenter,
      electrician,
      plumber,
      painter,
      totalLabours,
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Labour Attendance Added Successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Attendance
const getAttendance = async (req, res) => {
  try {
    let attendance;

    if (
      req.user.role === "owner" ||
      req.user.role === "admin" ||
      req.user.role === "hr"
    ) {
      attendance = await Labour.find()
        .populate("site", "siteName")
        .populate("siteEngineer", "name");
    } else {
      attendance = await Labour.find({
        siteEngineer: req.user._id,
      })
        .populate("site", "siteName")
        .populate("siteEngineer", "name");
    }

    res.json({
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

module.exports = {
  createAttendance,
  getAttendance,
};
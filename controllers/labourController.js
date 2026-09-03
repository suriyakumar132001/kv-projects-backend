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

    const totalLabours = [mason, helper, carpenter, electrician, plumber, painter]
      .map((count) => Number(count) || 0)
      .reduce((total, count) => total + count, 0);

    const attendance = await Labour.create({
      site,
      siteEngineer: req.user._id,
      mason: Number(mason) || 0,
      helper: Number(helper) || 0,
      carpenter: Number(carpenter) || 0,
      electrician: Number(electrician) || 0,
      plumber: Number(plumber) || 0,
      painter: Number(painter) || 0,
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

const getAttendanceById = async (req, res) => {
  try {
    const query = { _id: req.params.id };

    if (req.user.role === "siteengineer") {
      query.siteEngineer = req.user._id;
    }

    const attendance = await Labour.findOne(query)
      .populate("site", "siteName projectName")
      .populate("siteEngineer", "name email");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Labour attendance record not found",
      });
    }

    res.json({
      success: true,
      attendance,
      labour: attendance,
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
  getAttendanceById,
};
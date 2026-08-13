const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Site = require("../models/Site");

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
    let siteId = req.body.site;

    // Owner cannot check in attendance at all — view-only role.
    if (req.user.role === "owner") {
      return res.status(403).json({
        success: false,
        message:
          "Owner accounts cannot mark attendance. You can only view attendance records.",
      });
    }

    // Admin, HR, and Site Engineer can only ever check themselves in — the employee
    // they're linked to, never anyone chosen from a dropdown/body param.
    if (
      req.user.role === "admin" ||
      req.user.role === "hr" ||
      req.user.role === "siteengineer"
    ) {
      const myEmployee = await findOwnEmployee(req.user._id);

      if (!myEmployee) {
        return res.status(400).json({
          success: false,
          message:
            "No employee profile is linked to your account yet. Contact your Admin/Owner.",
        });
      }

      employeeId = myEmployee._id;

      // Site Engineers have restricted site selection; Admin/HR can select from all sites
      if (req.user.role === "siteengineer") {
        const assignedSites = await Site.find({
          siteEngineer: req.user._id,
        });

        if (!assignedSites.length) {
          return res.status(400).json({
            success: false,
            message:
              "No site is assigned to your account yet. Contact your Admin/Owner.",
          });
        }

        if (siteId) {
          const validSite = assignedSites.some(
            (site) => site._id.toString() === siteId,
          );

          if (!validSite) {
            return res.status(400).json({
              success: false,
              message:
                "Selected site is not assigned to your account.",
            });
          }
        } else {
          siteId = assignedSites[0]._id;
        }
      }
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (siteId) {
      const site = await Site.findById(siteId);

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Selected site not found",
        });
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance has already been marked for today. You can view or edit the existing record.",
      });
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      site: siteId,
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

    // Admin, HR, and Site Engineers can only check themselves out.
    if (
      req.user.role === "admin" ||
      req.user.role === "hr" ||
      req.user.role === "siteengineer"
    ) {
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
      .populate("site", "siteName projectName location")
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
    ).populate("site", "siteName projectName location");

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

// ======================================
// Delete Attendance
// ======================================
const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================
// Update Attendance
// ======================================
const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
    }

    // Only owner/admin can change attendance details.
    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update attendance.",
      });
    }

    const { checkIn, checkOut, remarks, status, site: siteId } = req.body;

    if (siteId) {
      const site = await Site.findById(siteId);

      if (!site) {
        return res.status(404).json({
          success: false,
          message: "Selected site not found",
        });
      }

      attendance.site = siteId;
    }

    if (checkIn) {
      attendance.checkIn = new Date(checkIn);
    }

    if (checkOut) {
      attendance.checkOut = new Date(checkOut);
    }

    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    if (status) {
      attendance.status = status;
    }

    if (attendance.checkIn && attendance.checkOut) {
      const hours =
        (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);

      attendance.workingHours = Number(hours.toFixed(2));

      attendance.overtimeHours = hours > 8 ? Number((hours - 8).toFixed(2)) : 0;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
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
// Get Today's Attendance Summary
// ======================================
const getTodayAttendance = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all active employees
    const allEmployees = await Employee.find({ status: "Active" })
      .select("_id employeeId name department email")
      .sort({ name: 1 });

    // Fetch today's attendance records
    const todayAttendance = await Attendance.find({
      attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("employee", "_id employeeId name department email")
      .populate("site", "siteName projectName");

    // Create a map of employee IDs to their attendance records for quick lookup
    const attendanceMap = {};
    todayAttendance.forEach((record) => {
      attendanceMap[record.employee._id.toString()] = record;
    });

    // Build attendance summary: each employee with their status
    const summary = allEmployees.map((employee) => {
      const attendance = attendanceMap[employee._id.toString()];

      if (!attendance) {
        return {
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          email: employee.email,
          status: "Not Marked",
          checkIn: null,
          checkOut: null,
        };
      }

      return {
        employeeId: attendance.employee.employeeId,
        name: attendance.employee.name,
        department: attendance.employee.department,
        email: attendance.employee.email,
        status: attendance.status || "Present",
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        site: attendance.site?.siteName,
      };
    });

    // Calculate statistics
    const stats = {
      totalEmployees: allEmployees.length,
      presentCount: summary.filter((s) => s.status === "Present").length,
      absentCount: summary.filter((s) => s.status === "Absent").length,
      halfDayCount: summary.filter((s) => s.status === "Half Day").length,
      leaveCount: summary.filter((s) => s.status === "Leave").length,
      notMarkedCount: summary.filter((s) => s.status === "Not Marked").length,
    };

    res.status(200).json({
      success: true,
      date: new Date().toISOString().split("T")[0],
      stats,
      records: summary,
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
  updateAttendance,
  deleteAttendance,
  getTodayAttendance,
};

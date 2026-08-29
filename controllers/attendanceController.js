const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Site = require("../models/Site");
const { getDistanceInMeters } = require("../utils/geoDistance");
const { getEuclideanDistance } = require("../utils/faceDistance");
const sendWhatsApp = require("../utils/sendWhatsApp");

// Looks up the Employee record linked to a logged-in user (used to lock
// Site Engineers to their own attendance only).
const findOwnEmployee = async (userId) => {
  return Employee.findOne({ user: userId });
};

// =============================================
// GPS Verification Helper
// =============================================
//
// Given a site and the coordinates reported by the
// browser, returns { distanceFromSite, locationVerified }.
// Never throws — a missing/invalid coordinate just
// results in locationVerified: null (not checked),
// so this never blocks a check-in on its own.
// =============================================

const verifyLocation = (site, latitude, longitude) => {
  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null ||
    !site ||
    site.latitude === null ||
    site.longitude === null
  ) {
    return { distanceFromSite: null, locationVerified: null };
  }

  const distanceFromSite = getDistanceInMeters(
    Number(latitude),
    Number(longitude),
    site.latitude,
    site.longitude,
  );

  const radius = site.geofenceRadius || 200;

  return {
    distanceFromSite,
    locationVerified: distanceFromSite <= radius,
  };
};

// =============================================
// Face Verification Helper
// =============================================
//
// Given the employee and a face descriptor captured in the
// browser at check-in time, returns { faceDistance, faceVerified }.
// Never throws — a missing descriptor (not enrolled yet, or no
// face captured this time) just results in faceVerified: null
// (not checked), so this never blocks a check-in on its own —
// same philosophy as verifyLocation() above.
//
// face-api.js's own guidance treats ~0.6 as a loose match and
// ~0.4 as a confident one; 0.5 is used here as a reasonable
// middle ground. Tune if you're seeing too many/few false flags.
// =============================================

const FACE_MATCH_THRESHOLD = 0.5;

const verifyFace = (employee, submittedDescriptor) => {
  if (
    !Array.isArray(submittedDescriptor) ||
    submittedDescriptor.length !== 128 ||
    !employee ||
    !Array.isArray(employee.faceDescriptor) ||
    employee.faceDescriptor.length !== 128
  ) {
    return { faceDistance: null, faceVerified: null };
  }

  const faceDistance = getEuclideanDistance(
    submittedDescriptor,
    employee.faceDescriptor,
  );

  if (faceDistance === null) {
    return { faceDistance: null, faceVerified: null };
  }

  return {
    faceDistance: Number(faceDistance.toFixed(4)),
    faceVerified: faceDistance <= FACE_MATCH_THRESHOLD,
  };
};

// ======================================
// Employee Check In
// ======================================
const checkIn = async (req, res) => {
  try {
    const body = req.body || {};

    let employeeId = body.employee;
    let siteId = body.site;

    // GPS coordinates from the browser's Geolocation API.
    // Optional at the request level — see verifyLocation().
    const { latitude, longitude } = body;

    // Face descriptor from the browser (face-api.js). Optional at
    // the request level — see verifyFace().
    const { faceDescriptor } = body;

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
              message: "Selected site is not assigned to your account.",
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

    let site = null;

    if (siteId) {
      site = await Site.findById(siteId);

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

    // ---------------------------------------------
    // GPS + Face Verification
    // ---------------------------------------------
    //
    // NOTE: Both flag, they do not block. A check-in outside the
    // geofence or with a low face match is still recorded, just
    // marked locationVerified/faceVerified: false so Admin/Owner
    // can review it.
    //
    // To make either a hard block instead, uncomment the relevant
    // check below:
    //
    // if (locationVerified === false) {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Check-in rejected: you are ${distanceFromSite}m from the site (allowed: ${site.geofenceRadius}m).`,
    //   });
    // }
    //
    // if (faceVerified === false) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Check-in rejected: face did not match the enrolled profile.",
    //   });
    // }
    // ---------------------------------------------

    const { distanceFromSite, locationVerified } = verifyLocation(
      site,
      latitude,
      longitude,
    );

    // Basic blink-based liveness signal from the browser (see
    // checkBlinkLiveness in faceApiLoader.js). NOT strong
    // anti-spoofing — see the field comment in models/Attendance.js
    // for exactly what this does and doesn't protect against.
    // Optional: null/undefined if the frontend didn't run/finish
    // the check (e.g. an older client, or it timed out).
    const livenessVerified =
      typeof body.livenessVerified === "boolean" ? body.livenessVerified : null;

    const { faceDistance, faceVerified } = verifyFace(employee, faceDescriptor);

    const attendance = await Attendance.create({
      employee: employeeId,
      site: siteId,
      checkIn: new Date(),
      remarks: body.remarks,
      checkInLocation: {
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      distanceFromSite,
      locationVerified,
      faceDistance,
      faceVerified,
      livenessVerified,
    });

    const flags = [];

    if (locationVerified === false) {
      flags.push(`${distanceFromSite}m from the registered site location`);
    }

    if (faceVerified === false) {
      flags.push("face did not match the enrolled profile");
    }

    if (livenessVerified === false) {
      flags.push("liveness check (blink) was not confirmed");
    }

    res.status(201).json({
      success: true,
      message: flags.length
        ? `Check In Successful — note: ${flags.join("; ")}.`
        : "Check In Successful",
      attendance,
    });

    // Fire-and-forget: never block or fail the check-in response on this.
    if (employee.phone) {
      const timeStr = attendance.checkIn.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      sendWhatsApp({
        to: employee.phone,
        body: `Hi ${employee.name}, your attendance check-in at ${timeStr} has been recorded${
          site ? ` for ${site.siteName || site.name || "your site"}` : ""
        }.${flags.length ? " Note: " + flags.join("; ") + "." : ""}`,
      });
    }
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

    // req.body can be undefined if the client sends no body at all
    // (e.g. a PUT with no payload) — guard against that instead of
    // destructuring straight off it.
    const { latitude, longitude } = req.body || {};

    if (latitude !== undefined && longitude !== undefined) {
      attendance.checkOutLocation = {
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      };
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
    console.error("CHECK OUT ERROR:", error);

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
      .populate(
        "site",
        "siteName projectName location latitude longitude geofenceRadius",
      )
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
    const attendance = await Attendance.findById(req.params.id)
      .populate("employee", "employeeId name department")
      .populate("site", "siteName projectName location");

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
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update attendance.",
      });
    }

    const { checkIn, checkOut, remarks, status, site: siteId } = req.body || {};

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
        locationVerified: attendance.locationVerified,
        distanceFromSite: attendance.distanceFromSite,
        faceVerified: attendance.faceVerified,
        faceDistance: attendance.faceDistance,
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
      flaggedLocationCount: summary.filter((s) => s.locationVerified === false)
        .length,
      flaggedFaceCount: summary.filter((s) => s.faceVerified === false).length,
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

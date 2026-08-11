const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceById,
} = require("../controllers/attendanceController");

// ======================================
// Employee Check In
// ======================================
router.post(
  "/checkin",
  protect,
  authorize("owner", "hr", "siteengineer"),
  checkIn,
);

// ======================================
// Get All Attendance
// ======================================
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getAttendance,
);

// ======================================
// Get Single Attendance
// ======================================
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getAttendanceById,
);

// ======================================
// Employee Check Out
// ======================================
router.put(
  "/checkout/:id",
  protect,
  authorize("owner", "hr", "siteengineer"),
  checkOut,
);

module.exports = router;

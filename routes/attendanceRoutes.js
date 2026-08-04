const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  checkIn,
  checkOut,
  getAttendance
} = require("../controllers/attendanceController");

router.post(
  "/checkin",
  protect,
  authorize("owner", "hr", "siteengineer"),
  checkIn
);

router.put(
  "/checkout/:id",
  protect,
  authorize("owner", "hr", "siteengineer"),
  checkOut
);

router.get(
  "/",
  protect,
  authorize("owner", "hr", "admin"),
  getAttendance
);

module.exports = router;
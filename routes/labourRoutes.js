const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createAttendance,
  getAttendance,
} = require("../controllers/labourController");

router.post(
  "/",
  protect,
  authorize("siteengineer"),
  createAttendance
);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getAttendance
);

module.exports = router;
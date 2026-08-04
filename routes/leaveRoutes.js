const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  applyLeave,
  getLeaves,
  getLeave,
  approveLeave,
  rejectLeave,
} = require("../controllers/leaveController");

// Apply Leave
router.post(
  "/",
  protect,
  authorize("owner", "hr", "siteengineer"),
  applyLeave
);

// Get All Leaves
router.get(
  "/",
  protect,
  authorize("owner", "hr", "admin"),
  getLeaves
);

// Get Single Leave
router.get(
  "/:id",
  protect,
  authorize("owner", "hr", "admin"),
  getLeave
);

// Approve Leave
router.put(
  "/approve/:id",
  protect,
  authorize("owner", "hr"),
  approveLeave
);

// Reject Leave
router.put(
  "/reject/:id",
  protect,
  authorize("owner", "hr"),
  rejectLeave
);

module.exports = router;
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  applyLeave,
  getLeaves,
  getLeave,
  updateLeave,
  deleteLeave,
  approveLeave,
  rejectLeave,
} = require("../controllers/leaveController");

// Roles that can view and apply for their own leave
const ALL_EMPLOYEE_ROLES = [
  "owner",
  "admin",
  "hr",
  "accountant",
  "siteengineer",
];

// Roles that can approve / reject / edit other people's leave
const MANAGEMENT_ROLES = ["owner", "hr", "admin"];

// Apply Leave
router.post("/", protect, authorize(...ALL_EMPLOYEE_ROLES), applyLeave);

// Get All Leaves
router.get("/", protect, authorize(...ALL_EMPLOYEE_ROLES), getLeaves);

// Get Single Leave
router.get("/:id", protect, authorize(...ALL_EMPLOYEE_ROLES), getLeave);

// Approve Leave
router.put(
  "/approve/:id",
  protect,
  authorize(...MANAGEMENT_ROLES),
  approveLeave,
);

// Reject Leave
router.put("/reject/:id", protect, authorize(...MANAGEMENT_ROLES), rejectLeave);

// Update Leave
router.put("/:id", protect, authorize(...MANAGEMENT_ROLES), updateLeave);

// Delete Leave
router.delete("/:id", protect, authorize("owner"), deleteLeave);

module.exports = router;

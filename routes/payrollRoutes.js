const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getAttendanceSummary,
  createPayroll,
  getPayrolls,
  getPayroll,
  updatePayroll,
  markAsPaid,
  deletePayroll,
} = require("../controllers/payrollController");

// Get attendance summary for payroll pre-fill
router.get(
  "/attendance-summary",
  protect,
  authorize("owner", "hr", "admin"),
  getAttendanceSummary
);

// Generate Payroll
router.post(
  "/",
  protect,
  authorize("owner", "hr"),
  createPayroll
);

// View Payrolls
router.get(
  "/",
  protect,
  authorize("owner", "hr", "admin"),
  getPayrolls
);

// Get Single Payroll
router.get(
  "/:id",
  protect,
  authorize("owner", "hr", "admin"),
  getPayroll
);

// Update Payroll
router.put(
  "/:id",
  protect,
  authorize("owner", "hr"),
  updatePayroll
);

// Mark Salary Paid
router.put(
  "/pay/:id",
  protect,
  authorize("owner", "hr"),
  markAsPaid
);

// Delete Payroll
router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deletePayroll
);

module.exports = router;
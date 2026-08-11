const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createEmployee,
  getEmployees,
  getEmployee,
  getMyEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

// Create Employee
router.post("/", protect, authorize("owner", "hr"), createEmployee);

// Get My Own Employee Profile
// (must come before "/:id" — any logged-in role)
router.get("/me", protect, getMyEmployee);

// Get All Employees
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getEmployees,
);

// Get Single Employee
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getEmployee,
);

// Update Employee
router.put("/:id", protect, authorize("owner", "hr"), updateEmployee);

// Delete Employee
router.delete("/:id", protect, authorize("owner"), deleteEmployee);

module.exports = router;

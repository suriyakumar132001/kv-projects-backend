const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../config/multer");
const { handleUploadErrors } = require("../config/multer");

const {
  createEmployee,
  getEmployees,
  getEmployee,
  getMyEmployee,
  updateEmployee,
  deleteEmployee,
  enrollFace,
  removeFace,
  uploadPhoto,
  removePhoto,
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

// Enroll / Re-enroll Face
router.put("/:id/face", protect, authorize("owner", "hr"), enrollFace);

// Remove Enrolled Face
router.delete("/:id/face", protect, authorize("owner", "hr"), removeFace);

// Upload / Replace Profile Photo
// Same owner/hr restriction as updateEmployee/enrollFace above — not
// admin, matching this project's existing convention for employee writes.
router.post(
  "/:id/photo",
  protect,
  authorize("owner", "hr"),
  upload.single("photo"),
  handleUploadErrors,
  uploadPhoto,
);

// Remove Profile Photo
router.delete("/:id/photo", protect, authorize("owner", "hr"), removePhoto);

// Delete Employee
router.delete("/:id", protect, authorize("owner"), deleteEmployee);

module.exports = router;

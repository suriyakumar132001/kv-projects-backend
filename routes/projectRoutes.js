const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
} = require("../controllers/projectController");

// ======================================
// Create Project
// ======================================

router.post(
  "/",
  protect,
  authorize("owner", "hr"),
  createProject
);

// ======================================
// Get All Projects
// ======================================

router.get(
  "/",
  protect,
  authorize("owner", "hr", "admin", "siteengineer"),
  getProjects
);

// ======================================
// Project Statistics
// ======================================

router.get(
  "/stats",
  protect,
  authorize("owner", "hr", "admin"),
  getProjectStats
);

// ======================================
// Get Single Project
// ======================================

router.get(
  "/:id",
  protect,
  authorize("owner", "hr", "admin", "siteengineer"),
  getProject
);

// ======================================
// Update Project
// ======================================

router.put(
  "/:id",
  protect,
  authorize("owner", "hr"),
  updateProject
);

// ======================================
// Delete Project
// ======================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteProject
);

module.exports = router;
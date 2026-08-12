// ===============================================
// KV Projects ERP
// Project Routes
// ===============================================

const express = require("express");

const router = express.Router();

// ===============================================
// Middleware
// ===============================================

const protect = require("../middleware/authMiddleware");

const authorize = require("../middleware/roleMiddleware");

// ===============================================
// Controllers
// ===============================================

const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getProject360,
} = require("../controllers/projectController");

// ===============================================
// Create Project
// ===============================================

router.post(
  "/",
  protect,
  authorize("owner", "hr"),
  createProject
);

// ===============================================
// Get All Projects
// ===============================================

router.get(
  "/",
  protect,
  authorize(
    "owner",
    "hr",
    "admin",
    "siteengineer"
  ),
  getProjects
);

// ===============================================
// Project Statistics
// ===============================================

router.get(
  "/stats",
  protect,
  authorize(
    "owner",
    "hr",
    "admin"
  ),
  getProjectStats
);

// ===============================================
// Project 360° Dashboard
// ===============================================

router.get(
  "/:id/360",
  protect,
  authorize(
    "owner",
    "hr",
    "admin",
    "siteengineer"
  ),
  getProject360
);

// ===============================================
// Get Single Project
// ===============================================

router.get(
  "/:id",
  protect,
  authorize(
    "owner",
    "hr",
    "admin",
    "siteengineer"
  ),
  getProject
);

// ===============================================
// Update Project
// ===============================================

router.put(
  "/:id",
  protect,
  authorize(
    "owner",
    "hr"
  ),
  updateProject
);

// ===============================================
// Delete Project
// ===============================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteProject
);

// ===============================================
// Export Router
// ===============================================

module.exports = router;
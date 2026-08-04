// =========================================
// KV Projects ERP
// DPR Routes
// =========================================

const express = require("express");
const router = express.Router();

// =========================================
// Middleware
// =========================================

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../config/multer");

// =========================================
// Controller
// =========================================

const {
  createDPR,
  getAllReports,
  getSingleReport,
  deleteReport,
} = require("../controllers/dprController");

// =========================================
// Create Daily Progress Report
// Site Engineer Only
// =========================================

router.post(
  "/",
  protect,
  authorize("siteengineer"),
  upload.array("images", 10),
  createDPR
);

// =========================================
// Get All Reports
// Owner, Admin, HR, Site Engineer
// =========================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getAllReports
);

// =========================================
// Get Single Report
// =========================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getSingleReport
);

// =========================================
// Delete Report
// Owner & Admin Only
// =========================================

router.delete(
  "/:id",
  protect,
  authorize("owner", "admin"),
  deleteReport
);

// =========================================

module.exports = router;
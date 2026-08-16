// ===============================================
// KV Projects ERP
// Project Profitability Routes
// ===============================================

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getProjectProfitability,
  getAllProjectsProfitability,
} = require("../controllers/profitabilityController");

// =================================================
// GET ALL PROJECTS PROFITABILITY SUMMARY
// GET /api/profitability
// =================================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  getAllProjectsProfitability,
);

// =================================================
// GET SINGLE PROJECT PROFITABILITY
// GET /api/profitability/:projectId
// =================================================

router.get(
  "/:projectId",
  protect,
  authorize("owner", "admin", "accountant"),
  getProjectProfitability,
);

module.exports = router;

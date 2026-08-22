const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { getCrmDashboard } = require("../controllers/crmDashboardController");

// GET /api/crm/dashboard?fromDate=2026-08-01&toDate=2026-08-31
router.get(
  "/dashboard",
  protect,
  authorize("owner", "admin", "accountant"),
  getCrmDashboard,
);

module.exports = router;

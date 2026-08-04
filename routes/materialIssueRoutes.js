const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createMaterialIssue,
  getMaterialIssues,
} = require("../controllers/materialIssueController");

// Site Engineer - Issue Material
router.post(
  "/",
  protect,
  authorize("siteengineer"),
  createMaterialIssue
);

// View Material Issues
router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getMaterialIssues
);

module.exports = router;
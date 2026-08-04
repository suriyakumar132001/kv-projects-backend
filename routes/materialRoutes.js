const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createMaterial,
  getMaterials,
} = require("../controllers/materialController");

// Admin & Owner Create Material
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createMaterial
);

// View Materials
router.get(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer", "hr"),
  getMaterials
);

module.exports = router;
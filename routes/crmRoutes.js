const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { getDashboard } = require("../controllers/crmController");

router.get(
  "/dashboard",
  protect,
  authorize("owner", "admin", "accountant"),
  getDashboard,
);

module.exports = router;

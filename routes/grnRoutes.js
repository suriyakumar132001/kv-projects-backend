const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createGRN,
  getGRNs,
} = require("../controllers/grnController");

router.post(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer"),
  createGRN
);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getGRNs
);

module.exports = router;
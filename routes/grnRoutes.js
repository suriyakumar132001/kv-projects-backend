const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createGRN,
  getGRNs,
  getSingleGRN,
} = require("../controllers/grnController");

router.post(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer"),
  createGRN,
);

router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant", "siteengineer"),
  getGRNs,
);

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant", "siteengineer"),
  getSingleGRN,
);

module.exports = router;

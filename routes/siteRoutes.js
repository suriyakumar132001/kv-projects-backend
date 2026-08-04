const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");


const {
    createSite,
    getSites,
    assignEngineer
} = require("../controllers/siteController");

// Owner & Admin can create sites
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createSite
);

// All logged-in roles can view sites
router.get(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer", "hr"),
  getSites
);
router.put(
    "/assign-engineer",
    protect,
    authorize("owner","admin"),
    assignEngineer
);

module.exports = router;
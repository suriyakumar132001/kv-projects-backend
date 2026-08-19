const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createSite,
  getSites,
  getSiteById,
  updateSite,
  deleteSite,
  assignEngineer,
} = require("../controllers/siteController");

// Owner & Admin can create sites
router.post("/", protect, authorize("owner", "admin"), createSite);

// All logged-in roles can view sites
router.get(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer", "hr"),
  getSites,
);
router.put(
  "/assign-engineer",
  protect,
  authorize("owner", "admin"),
  assignEngineer,
);

// Get a single site (Site Engineers restricted to their own — see
// getSiteById). Needed by EditSite/SiteDetails on the frontend.
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer", "hr"),
  getSiteById,
);

// Owner & Admin can update a site — this is what lets an existing
// site's geofence (latitude/longitude/geofenceRadius) be set or
// corrected after creation, which attendance's GPS geofence check
// depends on (see verifyLocation() in attendanceController.js).
router.put("/:id", protect, authorize("owner", "admin"), updateSite);

// Owner & Admin can delete a site
router.delete("/:id", protect, authorize("owner", "admin"), deleteSite);

module.exports = router;

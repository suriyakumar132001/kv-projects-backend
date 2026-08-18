// =========================================
// KV Projects ERP
// Client Portal Admin Routes
// =========================================
//
// Mounted at the same "/api/clients" prefix as your
// existing clientRoutes.js, alongside it (not
// replacing it). Paths here ("/:id/activate-portal")
// don't collide with standard CRUD routes.
// =========================================

const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  activateClientPortal,
  deactivateClientPortal,
} = require("../controllers/clientPortalAdminController");

router.put(
  "/:id/activate-portal",
  protect,
  authorize("owner", "admin"),
  activateClientPortal,
);

router.put(
  "/:id/deactivate-portal",
  protect,
  authorize("owner", "admin"),
  deactivateClientPortal,
);

module.exports = router;

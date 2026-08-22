const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createLead,
  getLeads,
  getLead,
  updateLead,
  updateStage,
  addNote,
  convertToClient,
  deleteLead,
} = require("../controllers/leadController");

// Matches the frontend's canCreate check: owner, admin, accountant
router.post(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  createLead,
);

// Any authenticated staff role can view (own leads only, unless owner/admin — enforced in controller)
router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant", "hr", "siteengineer"),
  getLeads,
);

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant", "hr", "siteengineer"),
  getLead,
);

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  updateLead,
);

router.put(
  "/:id/stage",
  protect,
  authorize("owner", "admin", "accountant"),
  updateStage,
);

router.post(
  "/:id/notes",
  protect,
  authorize("owner", "admin", "accountant"),
  addNote,
);

// Matches the frontend's canConvert check: owner, admin
router.post(
  "/:id/convert",
  protect,
  authorize("owner", "admin"),
  convertToClient,
);

// Matches the frontend's canDelete check: owner
router.delete("/:id", protect, authorize("owner"), deleteLead);

module.exports = router;

const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createLead,
  getLeads,
  getLead,
  updateLead,
  updateLeadStage,
  addLeadNote,
  convertLeadToClient,
  deleteLead,
} = require("../controllers/leadController");

// =====================================
// Create Lead
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  createLead,
);

// =====================================
// Get All Leads
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant"),
  getLeads,
);

// =====================================
// Get Single Lead
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  getLead,
);

// =====================================
// Update Lead
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  updateLead,
);

// =====================================
// Update Lead Stage (Kanban move)
// =====================================

router.put(
  "/:id/stage",
  protect,
  authorize("owner", "admin", "accountant"),
  updateLeadStage,
);

// =====================================
// Add Follow-up Note
// =====================================

router.post(
  "/:id/notes",
  protect,
  authorize("owner", "admin", "accountant"),
  addLeadNote,
);

// =====================================
// Convert Lead to Client
// =====================================

router.post(
  "/:id/convert",
  protect,
  authorize("owner", "admin"),
  convertLeadToClient,
);

// =====================================
// Delete Lead
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteLead,
);

module.exports = router;

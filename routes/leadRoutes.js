const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  updateStage,
  addNote,
  convertToClient,
  deleteLead,
} = require("../controllers/leadController");

// =====================================
// Get All Leads / Create Lead
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "accountant", "hr"),
  getLeads,
);

router.post(
  "/",
  protect,
  authorize("owner", "admin", "accountant", "hr"),
  createLead,
);

// =====================================
// Single Lead
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant", "hr"),
  getLead,
);

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  updateLead,
);

router.delete("/:id", protect, authorize("owner"), deleteLead);

// =====================================
// Stage Move / Notes / Convert
// =====================================

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

router.post(
  "/:id/convert",
  protect,
  authorize("owner", "admin"),
  convertToClient,
);

module.exports = router;

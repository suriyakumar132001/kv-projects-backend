const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  updateMyProfile,
  getMyPayslips,
  getMyPayslip,
  getMySummary,
} = require("../controllers/essController");

// No role restriction beyond `protect` — every logged-in user (whatever
// their role) can view/edit their OWN data through these routes. The
// controller resolves "own" from the token, never from the request body.

router.get("/summary", protect, getMySummary);

// Reading your own profile: GET /api/employees/me (already existed).
router.put("/profile", protect, updateMyProfile);

router.get("/payslips", protect, getMyPayslips);
router.get("/payslips/:id", protect, getMyPayslip);

module.exports = router;

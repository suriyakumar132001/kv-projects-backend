const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const checkPermission = require("../middleware/checkPermission");

const {
  createLabourBill,
  getLabourBills,
  getLabourBill,
  updateLabourBill,
  updateLabourBillStatus,
  deleteLabourBill,
} = require("../controllers/labourBillController");

// =====================================
// Create Labour Bill
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin", "hr", "accountant", "siteengineer"),
  checkPermission("labourBills", "create"),
  createLabourBill,
);

// =====================================
// Get All / Single
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr", "accountant", "siteengineer"),
  getLabourBills,
);

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "accountant", "siteengineer"),
  getLabourBill,
);

// =====================================
// Update Labour Bill
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "accountant", "siteengineer"),
  checkPermission("labourBills", "edit"),
  updateLabourBill,
);

// =====================================
// Update Status — approval stays with Owner/Admin/Accountant
// =====================================

router.put(
  "/status/:id",
  protect,
  authorize("owner", "admin", "accountant"),
  checkPermission("labourBills", "edit"),
  updateLabourBillStatus,
);

// =====================================
// Delete — Owner only, matches Invoice's convention
// =====================================

router.delete("/:id", protect, authorize("owner"), deleteLabourBill);

module.exports = router;

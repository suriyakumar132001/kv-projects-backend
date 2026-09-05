// =========================================
// KV Projects ERP
// Client Portal Data Routes
// =========================================

const express = require("express");

const router = express.Router();

const protectClient = require("../middleware/clientAuthMiddleware");

const {
  getMyProjects,
  getMyProjectDetail,
  getMyInvoices,
  getMyPayments,
} = require("../controllers/clientPortalController");
const {
  createOrder,
  verifyPayment,
} = require("../controllers/razorpayController");

// Every route below requires a valid client token
router.use(protectClient);

router.get("/projects", getMyProjects);

router.get("/projects/:id", getMyProjectDetail);

router.get("/invoices", getMyInvoices);

router.get("/payments", getMyPayments);

router.post("/payments/create-order", createOrder);

router.post("/payments/verify", verifyPayment);

module.exports = router;

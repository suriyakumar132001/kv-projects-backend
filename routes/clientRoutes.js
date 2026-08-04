const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

// =====================================
// Create Client
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createClient
);

// =====================================
// Get All Clients
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "hr"),
  getClients
);

// =====================================
// Get Single Client
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr"),
  getClient
);

// =====================================
// Update Client
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updateClient
);

// =====================================
// Delete Client
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteClient
);

module.exports = router;
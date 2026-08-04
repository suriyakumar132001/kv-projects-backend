const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  assignAssetToSite,
} = require("../controllers/assetController");

// =====================================
// Create Asset
// =====================================

router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createAsset
);

// =====================================
// Get All Assets
// =====================================

router.get(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer"),
  getAssets
);

// =====================================
// Get Single Asset
// =====================================

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer"),
  getAsset
);

// =====================================
// Update Asset
// =====================================

router.put(
  "/:id",
  protect,
  authorize("owner", "admin"),
  updateAsset
);

// =====================================
// Assign Asset To Site
// =====================================

router.put(
  "/assign/:id",
  protect,
  authorize("owner", "admin"),
  assignAssetToSite
);

// =====================================
// Delete Asset
// =====================================

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteAsset
);

module.exports = router;
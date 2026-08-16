// =========================================
// KV Projects ERP
// Inventory Controller
//
// Read-only for now — stock is written exclusively by
// grnController.createGRN. A manual adjustment endpoint
// and Material Issue (stock deduction) can be added later
// in the same pattern.
// =========================================

const Inventory = require("../models/Inventory");

// =========================================
// Get Inventory
// Optional filter: ?site=
// =========================================

const getInventory = async (req, res) => {
  try {
    const { site } = req.query;

    const query = {};

    if (site) {
      query.site = site;
    }

    const inventory = await Inventory.find(query)
      .populate("site", "siteName")
      .sort({ materialName: 1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get Single Inventory Item
// =========================================

const getSingleInventoryItem = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id).populate(
      "site",
      "siteName",
    );

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get Low Stock Items
// Returns inventory items at or below a threshold quantity.
// Optional filters: ?site=  &threshold= (default 10)
// =========================================

const getLowStock = async (req, res) => {
  try {
    const { site, threshold } = req.query;

    const thresholdValue = threshold ? Number(threshold) : 10;

    const query = {
      quantity: { $lte: thresholdValue },
    };

    if (site) {
      query.site = site;
    }

    const lowStockItems = await Inventory.find(query)
      .populate("site", "siteName")
      .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      threshold: thresholdValue,
      inventory: lowStockItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getInventory,
  getSingleInventoryItem,
  getLowStock,
};

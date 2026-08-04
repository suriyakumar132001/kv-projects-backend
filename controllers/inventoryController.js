const Inventory = require("../models/Inventory");

// Get Inventory
const getInventory = async (req, res) => {
  try {

    const inventory = await Inventory.find()
      .populate("site", "siteName");

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

module.exports = {
  getInventory,
};
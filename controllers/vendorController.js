const Vendor = require("../models/Vendor");

// Create Vendor
const createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Vendor Created Successfully",
      vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Vendors
const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find()
      .populate("createdBy", "name email");

    res.json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createVendor,
  getVendors,
};
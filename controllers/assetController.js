const Asset = require("../models/Asset");
const Site = require("../models/Site");

// =====================================
// Create Asset
// =====================================

const createAsset = async (req, res) => {
  try {

    const asset = await Asset.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Asset Created Successfully",
      asset,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Assets
// =====================================

const getAssets = async (req, res) => {
  try {

    const assets = await Asset.find()
      .populate("site", "siteName")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name");

    res.status(200).json({
      success: true,
      count: assets.length,
      assets,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get Single Asset
// =====================================

const getAsset = async (req, res) => {
  try {

    const asset = await Asset.findById(req.params.id)
      .populate("site", "siteName")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name");

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.status(200).json({
      success: true,
      asset,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Update Asset
// =====================================

const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Asset Updated Successfully",
      asset,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// =====================================
// Delete Asset
// =====================================

const deleteAsset = async (req, res) => {
  try {

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    await asset.deleteOne();

    res.status(200).json({
      success: true,
      message: "Asset Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Assign Asset To Site
// =====================================

const assignAssetToSite = async (req, res) => {
  try {

    const { siteId } = req.body;

    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    asset.site = siteId;
    asset.status = "In Use";

    await asset.save();

    res.status(200).json({
      success: true,
      message: "Asset Assigned Successfully",
      asset,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  assignAssetToSite,
};
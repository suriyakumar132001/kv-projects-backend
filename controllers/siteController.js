// =========================================
// KV Projects ERP
// Site Controller
// =========================================

const Site = require("../models/Site");
const User = require("../models/User");

// =========================================
// Create Site
// =========================================

const createSite = async (req, res) => {
  try {
    const site = await Site.create(req.body);

    res.status(201).json({
      success: true,
      message: "Site Created Successfully",
      site,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Get Sites Based On User Role
// =========================================

const getSites = async (req, res) => {
  try {
    let sites = [];

    // Owner, Admin and HR can see all sites
    if (
      req.user.role === "owner" ||
      req.user.role === "admin" ||
      req.user.role === "hr"
    ) {
      sites = await Site.find()
        .populate("owner", "name email role")
        .populate("siteEngineer", "name email role");
    }

    // Site Engineer can only see assigned sites
    else if (req.user.role === "siteengineer") {
      sites = await Site.find({
        siteEngineer: req.user._id,
      }).populate("siteEngineer", "name email role");
    }

    res.status(200).json({
      success: true,
      count: sites.length,
      sites,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Assign Site Engineer
// =========================================

const assignEngineer = async (req, res) => {
  try {
    const { siteId, engineerId } = req.body;

    // Find Site
    const site = await Site.findById(siteId);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Find Engineer
    const engineer = await User.findById(engineerId);

    if (!engineer) {
      return res.status(404).json({
        success: false,
        message: "Engineer not found",
      });
    }

    // Check Role
    if (engineer.role !== "siteengineer") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a Site Engineer",
      });
    }

    // Remove old assignment if exists
    if (
      site.siteEngineer &&
      site.siteEngineer.toString() !== engineer._id.toString()
    ) {
      await User.findByIdAndUpdate(site.siteEngineer, {
        $pull: {
          assignedSites: site._id,
        },
      });
    }

    // Assign engineer to site
    site.siteEngineer = engineer._id;

    await site.save();

    // Add site to engineer if not already assigned
    if (
      !engineer.assignedSites.some(
        (id) => id.toString() === site._id.toString()
      )
    ) {
      engineer.assignedSites.push(site._id);
      await engineer.save();
    }

    const updatedSite = await Site.findById(site._id)
      .populate("siteEngineer", "name email phone")
      .populate("owner", "name email");

    res.status(200).json({
      success: true,
      message: "Engineer Assigned Successfully",
      site: updatedSite,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSite,
  getSites,
  assignEngineer,
};
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
// Get Single Site
// =========================================
//
// Added alongside updateSite/deleteSite below — the frontend's
// EditSite/SiteDetails pages already call GET /sites/:id (see
// siteService.getSite) but no matching route/controller existed,
// which is what left the geofence lat/long/radius fields (used by
// the attendance geofence check — see verifyLocation() in
// attendanceController.js) impossible to view or edit after a site
// was first created.
// =========================================

const getSiteById = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate("owner", "name email role")
      .populate("siteEngineer", "name email role");

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Site Engineers may only view sites assigned to them.
    if (
      req.user.role === "siteengineer" &&
      (!site.siteEngineer ||
        site.siteEngineer._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view sites assigned to you.",
      });
    }

    res.status(200).json({
      success: true,
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
// Update Site
// =========================================
//
// Owner/Admin only. This is what lets an existing site's geofence
// (latitude, longitude, geofenceRadius) be set/corrected after
// creation — required for attendance's GPS geofence validation to
// work on sites that weren't geo-tagged at creation time.
// =========================================

const updateSite = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // siteEngineer reassignment stays on the dedicated
    // assign-engineer endpoint (keeps the assignedSites bookkeeping
    // on User in one place) — ignore it here if sent.
    const { siteEngineer, ...updatableFields } = req.body || {};

    Object.assign(site, updatableFields);

    await site.save();

    const updatedSite = await Site.findById(site._id)
      .populate("owner", "name email role")
      .populate("siteEngineer", "name email role");

    res.status(200).json({
      success: true,
      message: "Site updated successfully",
      site: updatedSite,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================================
// Delete Site
// =========================================
//
// Owner/Admin only.
// =========================================

const deleteSite = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    await site.deleteOne();

    res.status(200).json({
      success: true,
      message: "Site deleted successfully",
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
        (id) => id.toString() === site._id.toString(),
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
  getSiteById,
  updateSite,
  deleteSite,
  assignEngineer,
};

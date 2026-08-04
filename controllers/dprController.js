// =========================================
// KV Projects ERP
// Daily Progress Report Controller
// =========================================

const DPR = require("../models/DPR");
const Site = require("../models/Site");

// =========================================
// Create Daily Progress Report
// =========================================

const createDPR = async (req, res) => {
  try {

    const {
      site,
      weather,
      labour,
      materials,
      progress,
      workDescription,
      tomorrowPlan,
      issues,
      remarks
    } = req.body;

    // ================================
    // Upload Images
    // ================================

    const imagePaths = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        imagePaths.push("/uploads/" + file.filename);
      });
    }

    // ================================
    // Check Site Exists
    // ================================

    const siteExists = await Site.findById(site);

    if (!siteExists) {
      return res.status(404).json({
        success: false,
        message: "Site not found"
      });
    }

    // ================================
    // Create DPR
    // ================================

    const report = await DPR.create({
      site,
      siteEngineer: req.user._id,
      weather,
      labour,
      materials,
      progress,
      workDescription,
      tomorrowPlan,
      issues,
      remarks,
      images: imagePaths
    });

    // ================================
    // Update Site Progress
    // ================================

    siteExists.progress = progress;
    await siteExists.save();

    res.status(201).json({
      success: true,
      message: "Daily Progress Report Submitted Successfully",
      report
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// =========================================
// Get All Reports
// =========================================

const getAllReports = async (req, res) => {

  try {

    let reports;

    if (
      req.user.role === "owner" ||
      req.user.role === "admin" ||
      req.user.role === "hr"
    ) {

      reports = await DPR.find()
        .populate("site", "siteName location progress")
        .populate("siteEngineer", "name email");

    } else {

      reports = await DPR.find({
        siteEngineer: req.user._id
      })
        .populate("site", "siteName location progress")
        .populate("siteEngineer", "name email");

    }

    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// =========================================
// Get Single Report
// =========================================

const getSingleReport = async (req, res) => {

  try {

    const report = await DPR.findById(req.params.id)
      .populate("site")
      .populate("siteEngineer", "name email");

    if (!report) {

      return res.status(404).json({
        success: false,
        message: "Report not found"
      });

    }

    res.status(200).json({
      success: true,
      report
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

// =========================================
// Delete Report
// =========================================

const deleteReport = async (req, res) => {

  try {

    const report = await DPR.findById(req.params.id);

    if (!report) {

      return res.status(404).json({
        success: false,
        message: "Report not found"
      });

    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report Deleted Successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

module.exports = {
  createDPR,
  getAllReports,
  getSingleReport,
  deleteReport
};
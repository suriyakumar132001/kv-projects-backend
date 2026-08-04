const Quotation = require("../models/Quotation");

// =====================================
// Create Quotation
// =====================================

const createQuotation = async (req, res) => {
  try {

    const quotation = await Quotation.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Quotation Created Successfully",
      quotation,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Quotations
// =====================================

const getQuotations = async (req, res) => {

  try {

    const quotations = await Quotation.find()
      .populate("client", "clientName companyName phone")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: quotations.length,
      quotations,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Get Single Quotation
// =====================================

const getQuotation = async (req, res) => {

  try {

    const quotation = await Quotation.findById(req.params.id)
      .populate("client")
      .populate("createdBy", "name email");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(200).json({
      success: true,
      quotation,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Update Quotation
// =====================================

const updateQuotation = async (req, res) => {

  try {

    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Quotation Updated Successfully",
      quotation: updatedQuotation,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Delete Quotation
// =====================================

const deleteQuotation = async (req, res) => {

  try {

    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    await quotation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Quotation Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Update Quotation Status
// =====================================

const updateQuotationStatus = async (req, res) => {

  try {

    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    quotation.status = req.body.status;

    await quotation.save();

    res.status(200).json({
      success: true,
      message: "Quotation Status Updated Successfully",
      quotation,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
};
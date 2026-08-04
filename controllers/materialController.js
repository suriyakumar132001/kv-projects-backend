const Material = require("../models/Material");

// Create Material
const createMaterial = async (req, res) => {
  try {
    const material = await Material.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Material Created Successfully",
      material,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Materials
const getMaterials = async (req, res) => {
  try {
    const materials = await Material.find()
      .populate("site", "siteName")
      .populate("createdBy", "name");

    res.json({
      success: true,
      count: materials.length,
      materials,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createMaterial,
  getMaterials,
};
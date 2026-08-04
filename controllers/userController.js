// =======================================
// KV Projects ERP
// User Controller
// =======================================

const User = require("../models/User");

// =======================================
// Get All Users
// =======================================

const getAllUsers = async (req, res) => {
  try {

    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =======================================
// Get User By ID
// =======================================

const getUser = async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {

      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    }

    res.json({
      success: true,
      user,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  getAllUsers,
  getUser,
};
// =============================================
// KV Projects ERP
// Authentication Controller
// =============================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// =============================================
// Register User
// =============================================

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // Check Existing User
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    // Generate JWT Token
    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
      },
    });

  } catch (error) {

    console.log("====================================");
    console.log("REGISTER ERROR");
    console.error(error);
    console.error(error.stack);
    console.log("====================================");

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =============================================
// Login User
// =============================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Compare Password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Generate Token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        status: user.status,
      },
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
  register,
  login,
};
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getAllUsers,
  getUser,
  updateProfile,
  changePassword,
  updateUserStatus,
} = require("../controllers/userController");

// Update My Profile (any logged-in user)

router.put("/profile", protect, updateProfile);

// Change My Password (any logged-in user)

router.put("/change-password", protect, changePassword);

// Only Owner & Admin can see all users

router.get("/", protect, authorize("owner", "admin"), getAllUsers);

// Owner, Admin, HR & Site Engineer can view a user

router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getUser,
);

// Only Owner & Admin can activate/deactivate a user

router.patch(
  "/:id/status",
  protect,
  authorize("owner", "admin"),
  updateUserStatus,
);

module.exports = router;

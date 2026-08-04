const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getAllUsers,
  getUser,
} = require("../controllers/userController");

// Only Owner & Admin can see all users
router.get(
  "/",
  protect,
  authorize("owner", "admin"),
  getAllUsers
);

// Owner, Admin, HR & Site Engineer can view a user
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "hr", "siteengineer"),
  getUser
);

module.exports = router;
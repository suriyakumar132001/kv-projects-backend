const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware"); // ⚠️ confirm this matches your actual export name
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/", getNotifications);
router.patch("/mark-all-read", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

// Create Task
router.post(
  "/",
  protect,
  authorize("owner", "admin"),
  createTask
);

// Get All Tasks
router.get(
  "/",
  protect,
  authorize("owner", "admin", "siteengineer"),
  getTasks
);

// Get Single Task
router.get(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer"),
  getTask
);

// Update Task
router.put(
  "/:id",
  protect,
  authorize("owner", "admin", "siteengineer"),
  updateTask
);

// Delete Task
router.delete(
  "/:id",
  protect,
  authorize("owner", "admin"),
  deleteTask
);

module.exports = router;
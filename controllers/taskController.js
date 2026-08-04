const Task = require("../models/Task");
const User = require("../models/User");
const Site = require("../models/Site");

// =====================================
// Create Task
// =====================================

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      site,
      assignedTo,
      priority,
      dueDate,
    } = req.body;

    // Check Site
    const siteExists = await Site.findById(site);

    if (!siteExists) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Check Engineer
    const engineer = await User.findById(assignedTo);

    if (!engineer) {
      return res.status(404).json({
        success: false,
        message: "Site Engineer not found",
      });
    }

    if (engineer.role !== "siteengineer") {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be a Site Engineer",
      });
    }

    const task = await Task.create({
      title,
      description,
      site,
      assignedTo,
      assignedBy: req.user._id,
      priority,
      dueDate,
    });

    res.status(201).json({
      success: true,
      message: "Task Created Successfully",
      task,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Tasks
// =====================================

const getTasks = async (req, res) => {

  try {

    let tasks;

    if (
      req.user.role === "owner" ||
      req.user.role === "admin"
    ) {

      tasks = await Task.find()
        .populate("site", "siteName")
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name");

    } else {

      tasks = await Task.find({
        assignedTo: req.user._id,
      })
        .populate("site", "siteName")
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name");

    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Get Single Task
// =====================================

const getTask = async (req, res) => {

  try {

    const task = await Task.findById(req.params.id)
      .populate("site", "siteName")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name");

    if (!task) {

      return res.status(404).json({
        success: false,
        message: "Task not found",
      });

    }

    res.status(200).json({
      success: true,
      task,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Update Task
// =====================================

const updateTask = async (req, res) => {

  try {

    const task = await Task.findById(req.params.id);

    if (!task) {

      return res.status(404).json({
        success: false,
        message: "Task not found",
      });

    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Task Updated Successfully",
      task: updatedTask,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Delete Task
// =====================================

const deleteTask = async (req, res) => {

  try {

    const task = await Task.findById(req.params.id);

    if (!task) {

      return res.status(404).json({
        success: false,
        message: "Task not found",
      });

    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: "Task Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};
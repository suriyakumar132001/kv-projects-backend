// ===============================================
// KV Projects ERP
// Project Controller
// ===============================================

const Project = require("../models/Project");

// ===============================================
// Create Project
// ===============================================

const createProject = async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Project Created Successfully",
      project,
    });
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Get All Projects
// ===============================================

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Get Single Project
// ===============================================

const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Update Project
// ===============================================

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    ).populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Project Updated Successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Delete Project
// ===============================================

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: "Project Deleted Successfully",
    });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Project Statistics
// ===============================================

const getProjectStats = async (req, res) => {
  try {
    const [
      totalProjects,
      runningProjects,
      pendingProjects,
      completedProjects,
      onHoldProjects,
    ] = await Promise.all([
      Project.countDocuments(),

      Project.countDocuments({
        status: "Running",
      }),

      Project.countDocuments({
        status: "Pending",
      }),

      Project.countDocuments({
        status: "Completed",
      }),

      Project.countDocuments({
        status: "On Hold",
      }),
    ]);

    // Calculate total project budget
    const budgetResult = await Project.aggregate([
      {
        $group: {
          _id: null,
          totalBudget: {
            $sum: {
              $ifNull: ["$budget", 0],
            },
          },
        },
      },
    ]);

    const totalBudget =
      budgetResult.length > 0 ? budgetResult[0].totalBudget : 0;

    res.status(200).json({
      success: true,

      stats: {
        totalProjects,
        runningProjects,
        pendingProjects,
        completedProjects,
        onHoldProjects,
        totalBudget,
      },
    });
  } catch (error) {
    console.error("GET PROJECT STATS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Project 360° Dashboard
// ===============================================
//
// IMPORTANT:
// This endpoint currently uses only fields that are
// confirmed in the Project model.
//
// We are NOT guessing fields from other ERP models
// until their actual schemas are verified.
// ===============================================

const getProject360 = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =============================================
    // Project Values
    // =============================================

    const budget = Number(project.budget || 0);

    const progress = Math.min(100, Math.max(0, Number(project.progress || 0)));

    // =============================================
    // Current Date
    // =============================================

    const today = new Date();

    let daysRemaining = null;

    if (project.endDate) {
      const endDate = new Date(project.endDate);

      const difference = endDate.getTime() - today.getTime();

      daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));
    }

    // =============================================
    // Financial Summary
    // =============================================
    //
    // Actual expenses are not calculated here yet
    // because the exact Expense model schema is not
    // verified in the current project source.
    //

    const financial = {
      budget,

      actualCost: 0,

      remainingBudget: budget,

      utilizationPercentage: 0,
    };

    // =============================================
    // Site Summary
    // =============================================
    //
    // These are placeholders until the actual
    // DPR/Labour/Material schemas are connected.
    //

    const siteSummary = {
      labour: 0,

      materials: 0,

      equipment: 0,

      dprSubmitted: false,
    };

    // =============================================
    // Purchase Summary
    // =============================================

    const purchases = {
      total: 0,

      pending: 0,

      approved: 0,

      received: 0,
    };

    // =============================================
    // Expense Summary
    // =============================================

    const expenses = {
      total: 0,
    };

    // =============================================
    // Alerts
    // =============================================

    const alerts = [];

    // =============================================
    // Budget Alert
    // =============================================

    if (budget === 0) {
      alerts.push("Project budget has not been configured.");
    }

    // =============================================
    // End Date Alert
    // =============================================

    if (
      daysRemaining !== null &&
      daysRemaining < 0 &&
      project.status !== "Completed"
    ) {
      alerts.push("Project end date has passed.");
    }

    // =============================================
    // Progress Alert
    // =============================================

    if (project.status === "Running" && progress === 0) {
      alerts.push("Project is running but progress is still 0%.");
    }

    // =============================================
    // Project 360 Response
    // =============================================

    res.status(200).json({
      success: true,

      dashboard: {
        project: {
          _id: project._id,

          projectName: project.projectName,

          clientName: project.clientName,

          location: project.location,

          description: project.description,

          projectManager: project.projectManager || "",

          startDate: project.startDate,

          endDate: project.endDate,

          budget,

          progress,

          status: project.status,

          createdBy: project.createdBy,

          createdAt: project.createdAt,

          updatedAt: project.updatedAt,

          daysRemaining,
        },

        financial,

        siteSummary,

        purchases,

        expenses,

        alerts,
      },
    });
  } catch (error) {
    console.error("GET PROJECT 360 ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================================
// Export Controllers
// ===============================================

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getProject360,
};

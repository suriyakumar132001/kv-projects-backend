// ===============================================
// KV Projects ERP
// Project Service
// ===============================================

const Project = require("../models/Project");

// ===============================================
// Get Project By ID
// ===============================================

const getProjectById = async (projectId) => {
  const project = await Project.findById(projectId)
    .populate("createdBy", "name email");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
};

// ===============================================
// Get All Projects
// ===============================================

const getAllProjects = async () => {
  const projects = await Project.find()
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return projects;
};

// ===============================================
// Get Project Statistics
// ===============================================

const getProjectStatistics = async () => {
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

  // ===============================================
  // Calculate Total Budget
  // ===============================================

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
    budgetResult.length > 0
      ? Number(budgetResult[0].totalBudget || 0)
      : 0;

  return {
    totalProjects,
    runningProjects,
    pendingProjects,
    completedProjects,
    onHoldProjects,
    totalBudget,
  };
};

// ===============================================
// Get Project 360° Dashboard
// ===============================================
//
// NOTE:
// At this stage this service uses only data that
// currently exists in the Project model.
//
// Later we will connect:
// - Expenses
// - Labour
// - Inventory
// - Material Issue
// - Purchase Orders
// - GRN
// - DPR
// - Invoices
// - Payments
//
// We will NOT create fake values for those modules.
// ===============================================

const getProject360Data = async (projectId) => {
  const project = await getProjectById(projectId);

  // ===============================================
  // Basic Project Information
  // ===============================================

  const budget = Number(project.budget || 0);

  const progress = Math.min(
    100,
    Math.max(0, Number(project.progress || 0))
  );

  // ===============================================
  // Financial Calculations
  // ===============================================

  const actualCost = 0;

  const remainingBudget = Math.max(
    0,
    budget - actualCost
  );

  const utilizationPercentage =
    budget > 0
      ? Number(((actualCost / budget) * 100).toFixed(2))
      : 0;

  // ===============================================
  // Return Dashboard
  // ===============================================

  return {
    project: {
      id: project._id,

      projectName: project.projectName,

      clientName: project.clientName,

      location: project.location,

      description: project.description || "",

      startDate: project.startDate || null,

      endDate: project.endDate || null,

      projectManager:
        project.projectManager || "",

      status: project.status,

      progress,

      budget,

      createdBy: project.createdBy || null,

      createdAt: project.createdAt,

      updatedAt: project.updatedAt,
    },

    // ===============================================
    // Financial Summary
    // ===============================================

    financial: {
      budget,

      actualCost,

      remainingBudget,

      utilizationPercentage,

      estimatedProfit: 0,
    },

    // ===============================================
    // Site Summary
    // ===============================================

    siteSummary: {
      labour: 0,

      materials: 0,

      equipment: 0,

      dprSubmitted: false,
    },

    // ===============================================
    // Purchase Summary
    // ===============================================

    purchases: {
      total: 0,

      pending: 0,

      approved: 0,

      received: 0,
    },

    // ===============================================
    // Expense Summary
    // ===============================================

    expenses: {
      total: 0,

      recent: [],
    },

    // ===============================================
    // Alerts
    // ===============================================

    alerts: [],
  };
};

// ===============================================
// Create Project
// ===============================================

const createProject = async (data, userId) => {
  const project = await Project.create({
    ...data,

    createdBy: userId,
  });

  return project;
};

// ===============================================
// Update Project
// ===============================================

const updateProject = async (projectId, data) => {
  const project = await Project.findByIdAndUpdate(
    projectId,

    data,

    {
      new: true,

      runValidators: true,
    }
  ).populate("createdBy", "name email");

  if (!project) {
    const error = new Error("Project not found");

    error.statusCode = 404;

    throw error;
  }

  return project;
};

// ===============================================
// Delete Project
// ===============================================

const deleteProject = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");

    error.statusCode = 404;

    throw error;
  }

  await project.deleteOne();

  return true;
};

// ===============================================
// Export
// ===============================================

module.exports = {
  getProjectById,

  getAllProjects,

  getProjectStatistics,

  getProject360Data,

  createProject,

  updateProject,

  deleteProject,
};


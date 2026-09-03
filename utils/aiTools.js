const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const Material = require("../models/Material");
const Leave = require("../models/Leave");
const MaterialRequest = require("../models/MaterialRequest");
const Project = require("../models/Project");
const Site = require("../models/Site");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const Attendance = require("../models/Attendance");
const DPR = require("../models/DPR");

const isPrivileged = (user) => ["owner", "admin"].includes(user.role);
const isFinance = (user) => isPrivileged(user) || user.role === "accountant";
const isValidId = (value) => mongoose.isValidObjectId(value);

function siteScope(user, field = "site") {
  if (isPrivileged(user)) return {};
  if (user.role === "siteengineer") {
    return {
      $or: [
        { [field]: { $in: user.assignedSites || [] } },
        { siteEngineer: user._id },
      ],
    };
  }
  return { [field]: { $in: user.assignedSites || [] } };
}

function requireFinance(user) {
  if (!isFinance(user))
    throw new Error("You do not have permission to view financial data.");
}

function requireRole(user, roles) {
  if (!roles.includes(user.role))
    throw new Error("You do not have permission to view this data.");
}

async function getOverdueInvoices(_, user) {
  requireFinance(user);
  const invoices = await Invoice.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $in: ["Pending", "Partial"] },
  })
    .select("invoiceNumber projectName dueDate grandTotal paymentStatus")
    .lean();
  return { count: invoices.length, invoices };
}

async function getBudgetStatus({ projectId }, user) {
  requireFinance(user);
  if (!isValidId(projectId)) throw new Error("A valid projectId is required.");
  const project = await Project.findById(projectId)
    .select("projectName site budget")
    .lean();
  if (!project) throw new Error("Project not found.");
  if (
    !isPrivileged(user) &&
    user.role === "siteengineer" &&
    !(user.assignedSites || []).some(
      (id) => String(id) === String(project.site),
    )
  ) {
    throw new Error("You do not have permission to view this project budget.");
  }
  const siteId = project.site;
  const budget = siteId ? await Budget.findOne({ site: siteId }).lean() : null;
  const [expenseResult, poResult] = await Promise.all([
    Expense.aggregate([
      { $match: { site: siteId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { site: siteId, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);
  const expenses = expenseResult[0]?.total || 0;
  const purchaseOrders = poResult[0]?.total || 0;
  return {
    project: project.projectName,
    allocated: budget?.totalBudget ?? project.budget ?? 0,
    spent: expenses + purchaseOrders,
    expenses,
    purchaseOrders,
    remaining:
      (budget?.totalBudget ?? project.budget ?? 0) - expenses - purchaseOrders,
  };
}

async function getMaterialStock({ siteId, materialName }, user) {
  if (!isValidId(siteId)) throw new Error("A valid siteId is required.");
  requireRole(user, ["owner", "admin", "siteengineer"]);
  const allowedSites = user.assignedSites || [];
  if (
    !isPrivileged(user) &&
    !allowedSites.some((id) => String(id) === String(siteId))
  ) {
    throw new Error("You do not have permission to view stock at this site.");
  }
  const query = { site: siteId };
  if (materialName)
    query.materialName = { $regex: materialName, $options: "i" };
  const [inventory, materials] = await Promise.all([
    Inventory.find(query)
      .select("materialName unit quantity reorderLevel lastUpdated")
      .lean(),
    Material.find({ ...query })
      .select("materialName unit quantity price")
      .lean(),
  ]);
  return { siteId, inventory, materials };
}

async function getPendingApprovals({ type = "all" }, user) {
  const result = {};
  if (["all", "leave"].includes(type)) {
    requireRole(user, ["owner", "admin", "hr"]);
    result.leaves = await Leave.find({ status: "Pending" })
      .populate("employee", "name employeeId")
      .lean();
  }
  if (["all", "material_request"].includes(type)) {
    requireRole(user, ["owner", "admin"]);
    result.materialRequests = await MaterialRequest.find({ status: "Pending" })
      .populate("site", "siteName")
      .populate("requestedBy", "name")
      .lean();
  }
  if (["all", "purchase_order"].includes(type)) {
    requireRole(user, ["owner", "admin", "accountant"]);
    // PurchaseOrder has no Pending enum; Ordered is the awaiting/active state.
    result.purchaseOrders = await PurchaseOrder.find({ status: "Ordered" })
      .populate("site", "siteName")
      .populate("createdBy", "name")
      .lean();
  }
  return result;
}

async function getProjectSummary({ projectId }, user) {
  if (!isValidId(projectId)) throw new Error("A valid projectId is required.");
  const project = await Project.findById(projectId)
    .populate("site", "siteName projectName")
    .lean();
  if (!project) throw new Error("Project not found.");
  if (
    !isPrivileged(user) &&
    user.role === "siteengineer" &&
    !(user.assignedSites || []).some(
      (id) => String(id) === String(project.site?._id || project.site),
    )
  ) {
    throw new Error("You do not have permission to view this project.");
  }
  const siteId = project.site?._id || project.site;
  const [expenses, purchaseOrders, openTasks] = await Promise.all([
    Expense.aggregate([
      { $match: { site: siteId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { site: siteId, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Task.countDocuments({ site: siteId, status: { $ne: "Completed" } }),
  ]);
  return {
    project: {
      id: project._id,
      name: project.projectName,
      status: project.status,
      budget: project.budget,
    },
    siteCount: siteId ? 1 : 0,
    spent: (expenses[0]?.total || 0) + (purchaseOrders[0]?.total || 0),
    openTasks,
  };
}

async function getLeadsNeedingFollowup(_, user) {
  requireRole(user, ["owner", "admin"]);
  const leads = await Lead.find({
    nextFollowUpDate: { $ne: null, $lte: new Date() },
    stage: { $nin: ["Lost", "Converted"] },
  })
    .select("leadName companyName phone stage nextFollowUpDate assignedTo")
    .lean();
  return { count: leads.length, leads };
}

function assertSiteAccess(user, siteId) {
  if (isPrivileged(user)) return;
  const allowedSites = user.assignedSites || [];
  if (!allowedSites.some((id) => String(id) === String(siteId))) {
    throw new Error("You do not have permission to view this site.");
  }
}

async function getMyTasks({ status }, user) {
  const query = { assignedTo: user._id };
  if (status) {
    if (!["Pending", "In Progress", "Completed"].includes(status)) {
      throw new Error("status must be one of Pending, In Progress, Completed.");
    }
    query.status = status;
  } else {
    query.status = { $ne: "Completed" };
  }
  const tasks = await Task.find(query)
    .populate("site", "siteName")
    .select("title priority status dueDate site")
    .sort({ dueDate: 1 })
    .lean();
  return { count: tasks.length, tasks };
}

async function getAttendanceSummary({ siteId }, user) {
  if (!isValidId(siteId)) throw new Error("A valid siteId is required.");
  requireRole(user, ["owner", "admin", "hr", "siteengineer"]);
  assertSiteAccess(user, siteId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const records = await Attendance.find({
    site: siteId,
    attendanceDate: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate("employee", "name employeeId")
    .select("employee status workingHours")
    .lean();
  const summary = { Present: 0, Absent: 0, "Half Day": 0, Leave: 0 };
  for (const record of records) {
    if (summary[record.status] !== undefined) summary[record.status] += 1;
  }
  return {
    siteId,
    date: startOfDay.toISOString().slice(0, 10),
    totalMarked: records.length,
    summary,
    records,
  };
}

async function getSiteProgressStatus({ siteId }, user) {
  if (!isValidId(siteId)) throw new Error("A valid siteId is required.");
  assertSiteAccess(user, siteId);
  const latest = await DPR.findOne({ site: siteId })
    .sort({ reportDate: -1 })
    .select("reportDate progress workDescription issues tomorrowPlan weather")
    .lean();
  if (!latest)
    return {
      siteId,
      hasReports: false,
      message: "No DPR has been submitted for this site yet.",
    };
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const reportedToday = new Date(latest.reportDate) >= startOfDay;
  return {
    siteId,
    hasReports: true,
    reportedToday,
    latestReport: {
      date: latest.reportDate,
      progress: latest.progress,
      weather: latest.weather,
      workDescription: latest.workDescription,
      issues: latest.issues,
      tomorrowPlan: latest.tomorrowPlan,
    },
  };
}

const tools = [
  {
    name: "getOverdueInvoices",
    description: "Find unpaid or partially paid invoices past their due date.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getBudgetStatus",
    description: "Return allocated budget and actual spend for a project.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project MongoDB id" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "getMaterialStock",
    description: "Find current material inventory at a site.",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        materialName: { type: "string" },
      },
      required: ["siteId"],
      additionalProperties: false,
    },
  },
  {
    name: "getPendingApprovals",
    description:
      "List pending leave, material request, or active purchase-order approvals.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["leave", "material_request", "purchase_order", "all"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getProjectSummary",
    description:
      "Summarize a project, its budget, spend, site, and open tasks.",
    input_schema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      required: ["projectId"],
      additionalProperties: false,
    },
  },
  {
    name: "getLeadsNeedingFollowup",
    description: "Find active leads whose next follow-up is due or overdue.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getMyTasks",
    description:
      "List tasks assigned to the current user. Defaults to open (non-completed) tasks.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "In Progress", "Completed"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getAttendanceSummary",
    description:
      "Get today's attendance counts (present/absent/half day/leave) for a site.",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string", description: "Site MongoDB id" },
      },
      required: ["siteId"],
      additionalProperties: false,
    },
  },
  {
    name: "getSiteProgressStatus",
    description:
      "Get the latest daily progress report (DPR) for a site: progress percent, work done, issues, and whether today's report has been submitted.",
    input_schema: {
      type: "object",
      properties: { siteId: { type: "string" } },
      required: ["siteId"],
      additionalProperties: false,
    },
  },
];

const executors = {
  getOverdueInvoices,
  getBudgetStatus,
  getMaterialStock,
  getPendingApprovals,
  getProjectSummary,
  getLeadsNeedingFollowup,
  getMyTasks,
  getAttendanceSummary,
  getSiteProgressStatus,
};

module.exports = { tools, executors };

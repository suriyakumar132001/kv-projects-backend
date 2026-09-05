const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../models/Inventory");
const Material = require("../models/Material");
const Leave = require("../models/Leave");
const MaterialRequest = require("../models/MaterialRequest");
const Quotation = require("../models/Quotation");
const Employee = require("../models/Employee");
const Project = require("../models/Project");
const Site = require("../models/Site");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const DPR = require("../models/DPR");
const { createNotification } = require("../services/notificationService");
const escapeRegex = require("./escapeRegex");

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
    query.materialName = { $regex: escapeRegex(materialName), $options: "i" };
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
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const reportedToday =
    new Date(latest.reportDate) >= startOfDay &&
    new Date(latest.reportDate) <= endOfDay;
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

async function createTask(
  { title, description, siteId, assignedTo, priority, dueDate },
  user,
) {
  requireRole(user, ["owner", "admin"]);
  if (!title || !title.trim()) throw new Error("title is required.");
  if (!isValidId(siteId)) throw new Error("A valid siteId is required.");
  if (!isValidId(assignedTo))
    throw new Error("A valid assignedTo (site engineer user id) is required.");
  if (!dueDate || Number.isNaN(new Date(dueDate).getTime()))
    throw new Error("A valid dueDate is required.");
  const site = await Site.findById(siteId).select("siteName").lean();
  if (!site) throw new Error("Site not found.");
  const engineer = await User.findById(assignedTo).select("name role").lean();
  if (!engineer) throw new Error("Assigned user not found.");
  if (engineer.role !== "siteengineer")
    throw new Error("Assigned user must be a Site Engineer.");
  const task = await Task.create({
    title: title.trim(),
    description: description || "",
    site: siteId,
    assignedTo,
    assignedBy: user._id,
    priority: ["Low", "Medium", "High"].includes(priority)
      ? priority
      : "Medium",
    dueDate,
  });
  await createNotification({
    recipient: assignedTo,
    type: "general",
    title: "New task assigned",
    message: `${user.name || "Admin"} assigned you a task: "${task.title}" (due ${new Date(dueDate).toDateString()})`,
    link: `/tasks/${task._id}`,
    relatedModel: "Task",
    relatedId: task._id,
  });
  return {
    success: true,
    taskId: task._id,
    title: task.title,
    site: site.siteName,
    assignedTo: engineer.name,
    dueDate: task.dueDate,
  };
}

async function addLeadFollowup({ leadId, note, nextFollowUpDate }, user) {
  requireRole(user, ["owner", "admin", "accountant"]);
  if (!isValidId(leadId)) throw new Error("A valid leadId is required.");
  if (!note || !note.trim()) throw new Error("note text is required.");
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error("Lead not found.");
  lead.notes.push({ text: note.trim(), createdBy: user._id });
  lead.lastContactedAt = new Date();
  if (nextFollowUpDate) {
    if (Number.isNaN(new Date(nextFollowUpDate).getTime()))
      throw new Error("nextFollowUpDate is not a valid date.");
    lead.nextFollowUpDate = nextFollowUpDate;
  }
  await lead.save();
  return {
    success: true,
    leadId: lead._id,
    leadName: lead.leadName,
    notesCount: lead.notes.length,
    nextFollowUpDate: lead.nextFollowUpDate,
    lastContactedAt: lead.lastContactedAt,
  };
}

async function sendTeamReminder({ recipientUserId, title, message }, user) {
  requireRole(user, ["owner", "admin", "siteengineer", "hr", "accountant"]);
  if (!isValidId(recipientUserId))
    throw new Error("A valid recipientUserId is required.");
  if (!title || !title.trim() || !message || !message.trim())
    throw new Error("title and message are required.");
  const recipient = await User.findById(recipientUserId)
    .select("name role status")
    .lean();
  if (!recipient) throw new Error("Recipient user not found.");
  if (recipient.status === "Inactive")
    throw new Error("Recipient account is inactive.");
  await createNotification({
    recipient: recipientUserId,
    type: "general",
    title: title.trim(),
    message: `${message.trim()} (from ${user.name || "a teammate"})`,
  });
  return { success: true, sentTo: recipient.name };
}

async function getExpenseBreakdown({ siteId, startDate, endDate }, user) {
  requireFinance(user);
  const query = {};
  if (siteId) {
    if (!isValidId(siteId)) throw new Error("siteId is not a valid id.");
    query.site = siteId;
  }
  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    throw new Error("startDate/endDate must be valid dates.");
  query.expenseDate = { $gte: start, $lte: end };
  const rows = await Expense.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    siteId: siteId || "all",
    grandTotal,
    byCategory: rows.map((row) => ({
      category: row._id,
      total: row.total,
      count: row.count,
    })),
  };
}

async function getPendingPurchaseOrders({ siteId }, user) {
  const query = {
    status: { $in: ["Ordered", "Partially Received"] },
    ...siteScope(user),
  };
  if (siteId) {
    if (!isValidId(siteId)) throw new Error("siteId is not a valid id.");
    query.site = siteId;
  }
  const orders = await PurchaseOrder.find(query)
    .populate("site", "siteName")
    .populate("vendor", "vendorName")
    .select(
      "poNumber materialName quantity receivedQuantity unit status expectedDelivery site vendor",
    )
    .sort({ expectedDelivery: 1 })
    .lean();
  return { count: orders.length, orders };
}

async function updateLeadStage({ leadId, stage, lostReason }, user) {
  requireRole(user, ["owner", "admin", "accountant"]);
  if (!isValidId(leadId)) throw new Error("A valid leadId is required.");
  const allowed = ["New Lead", "Contacted", "On Hold", "Lost"];
  if (!allowed.includes(stage)) {
    throw new Error(
      `stage must be one of ${allowed.join(", ")}. To convert a lead, use the dedicated convert-to-client flow in the app instead.`,
    );
  }
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error("Lead not found.");
  lead.stage = stage;
  if (stage === "Lost") lead.lostReason = lostReason || lead.lostReason || "";
  await lead.save();
  return {
    success: true,
    leadId: lead._id,
    leadName: lead.leadName,
    stage: lead.stage,
  };
}

async function approveMaterialRequest(
  { requestId, decision, rejectionReason },
  user,
) {
  requireRole(user, ["owner", "admin"]);
  if (!isValidId(requestId))
    throw new Error("A valid requestId is required.");
  if (!["Approved", "Rejected"].includes(decision))
    throw new Error("decision must be 'Approved' or 'Rejected'.");
  const request = await MaterialRequest.findById(requestId);
  if (!request) throw new Error("Material request not found.");
  if (request.status !== "Pending")
    throw new Error(
      `This request has already been ${request.status.toLowerCase()}.`,
    );
  request.status = decision;
  request.approvedBy = user._id;
  request.approvedAt = new Date();
  if (decision === "Rejected") request.rejectionReason = rejectionReason || "";
  await request.save();
  await createNotification({
    recipient: request.requestedBy,
    type: "material_request",
    title: `Material Request ${decision}`,
    message: `Your request for ${request.materialName} was ${decision.toLowerCase()}${decision === "Rejected" && rejectionReason ? `: ${rejectionReason}` : ""}`,
    relatedModel: "MaterialRequest",
    relatedId: request._id,
  });
  return {
    success: true,
    requestId: request._id,
    materialName: request.materialName,
    status: request.status,
  };
}

async function getMyLeaveRequests({ status }, user) {
  const employee = await Employee.findOne({ user: user._id })
    .select("_id name")
    .lean();
  if (!employee)
    return {
      hasEmployeeRecord: false,
      message:
        "No employee record is linked to your account, so leave history isn't available here.",
    };
  const query = { employee: employee._id };
  if (status) {
    if (!["Pending", "Approved", "Rejected"].includes(status))
      throw new Error("status must be Pending, Approved, or Rejected.");
    query.status = status;
  }
  const leaves = await Leave.find(query)
    .select("leaveType fromDate toDate totalDays status reason")
    .sort({ fromDate: -1 })
    .limit(20)
    .lean();
  return {
    hasEmployeeRecord: true,
    employeeName: employee.name,
    count: leaves.length,
    leaves,
  };
}

async function getQuotationStatus({ status, clientId }, user) {
  requireRole(user, ["owner", "admin", "hr", "accountant"]);
  const query = {};
  if (status) {
    if (!["Draft", "Sent", "Approved", "Rejected"].includes(status)) {
      throw new Error("status must be one of Draft, Sent, Approved, Rejected.");
    }
    query.status = status;
  } else {
    query.status = { $in: ["Draft", "Sent"] };
  }
  if (clientId) {
    if (!isValidId(clientId)) throw new Error("clientId is not a valid id.");
    query.client = clientId;
  }
  const quotations = await Quotation.find(query)
    .populate("client", "clientName")
    .select("quotationNumber projectName grandTotal validTill status client")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return { count: quotations.length, quotations };
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
  {
    name: "createTask",
    description:
      "Create and assign a new task to a site engineer. Only owner/admin can do this. Always confirm the site, engineer name, and due date with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        siteId: { type: "string" },
        assignedTo: {
          type: "string",
          description: "User id of the site engineer",
        },
        priority: { type: "string", enum: ["Low", "Medium", "High"] },
        dueDate: { type: "string", description: "ISO date string" },
      },
      required: ["title", "siteId", "assignedTo", "dueDate"],
      additionalProperties: false,
    },
  },
  {
    name: "addLeadFollowup",
    description:
      "Add a follow-up note to a sales lead and optionally schedule the next follow-up date. Only owner/admin/accountant can do this.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        note: { type: "string" },
        nextFollowUpDate: {
          type: "string",
          description: "ISO date string, optional",
        },
      },
      required: ["leadId", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "sendTeamReminder",
    description:
      "Send an in-app notification/reminder to a specific teammate by their user id.",
    input_schema: {
      type: "object",
      properties: {
        recipientUserId: { type: "string" },
        title: { type: "string" },
        message: { type: "string" },
      },
      required: ["recipientUserId", "title", "message"],
      additionalProperties: false,
    },
  },
  {
    name: "getExpenseBreakdown",
    description:
      "Get total expenses grouped by category for a site (or all sites) within a date range. Defaults to the current month.",
    input_schema: {
      type: "object",
      properties: {
        siteId: { type: "string" },
        startDate: { type: "string", description: "ISO date, optional" },
        endDate: { type: "string", description: "ISO date, optional" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getPendingPurchaseOrders",
    description:
      "List purchase orders that are Ordered or Partially Received (not yet fully delivered), optionally filtered by site.",
    input_schema: {
      type: "object",
      properties: { siteId: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "updateLeadStage",
    description:
      "Move a lead to a new pipeline stage (New Lead, Contacted, On Hold, or Lost). Does NOT handle Converted — that requires the app's convert-to-client flow. Only owner/admin/accountant can do this.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        stage: {
          type: "string",
          enum: ["New Lead", "Contacted", "On Hold", "Lost"],
        },
        lostReason: {
          type: "string",
          description: "Optional, used when stage is Lost",
        },
      },
      required: ["leadId", "stage"],
      additionalProperties: false,
    },
  },
  {
    name: "approveMaterialRequest",
    description:
      "Approve or reject a pending material request. Only owner/admin can do this. Always confirm the material, quantity, and decision with the user before calling.",
    input_schema: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        decision: { type: "string", enum: ["Approved", "Rejected"] },
        rejectionReason: {
          type: "string",
          description: "Optional, used when decision is Rejected",
        },
      },
      required: ["requestId", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "getMyLeaveRequests",
    description:
      "List the current user's own leave requests and their status.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "Approved", "Rejected"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getQuotationStatus",
    description:
      "List quotations, optionally filtered by status or client. Defaults to Draft/Sent (awaiting client action).",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Draft", "Sent", "Approved", "Rejected"],
        },
        clientId: { type: "string" },
      },
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
  createTask,
  addLeadFollowup,
  sendTeamReminder,
  getExpenseBreakdown,
  getPendingPurchaseOrders,
  updateLeadStage,
  approveMaterialRequest,
  getMyLeaveRequests,
  getQuotationStatus,
};

module.exports = { tools, executors };

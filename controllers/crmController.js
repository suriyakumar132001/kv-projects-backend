// =============================================
// KV Projects ERP
// CRM Controller
// Aggregates Leads + Clients + Quotations + Invoices + Payments
// into the single dashboard the frontend renders.
// =============================================

const Lead = require("../models/Lead");
const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const STAGES = ["New Lead", "Contacted", "On Hold", "Lost", "Converted"];

// Rough win-probability weighting per quotation status, used only for
// the "weighted pipeline" figure — Draft/Sent are still open, so they
// get partial credit instead of full or zero value.
const STAGE_WEIGHT = {
  Draft: 0.2,
  Sent: 0.5,
};

// Builds a Mongo date-range filter for a given field from optional
// fromDate/toDate query params (YYYY-MM-DD strings).
const dateRangeFilter = (field, fromDate, toDate) => {
  if (!fromDate && !toDate) return {};

  const range = {};
  if (fromDate) range.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return { [field]: range };
};

const getDashboard = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const leadFilter = dateRangeFilter("createdAt", fromDate, toDate);
    const quotationFilter = dateRangeFilter("createdAt", fromDate, toDate);
    const invoiceFilter = dateRangeFilter("invoiceDate", fromDate, toDate);
    const paymentFilter = dateRangeFilter("paymentDate", fromDate, toDate);

    // -----------------------------------------
    // Leads
    // -----------------------------------------

    const leads = await Lead.find(leadFilter)
      .select("stage source assignedTo nextFollowUpDate createdAt")
      .populate("assignedTo", "name");

    const totalLeads = leads.length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newLeadsToday = leads.filter((l) => l.createdAt >= todayStart).length;

    const qualifiedLeads = leads.filter((l) => l.stage !== "New Lead").length;
    const convertedLeads = leads.filter((l) => l.stage === "Converted").length;

    const qualificationRate = totalLeads
      ? (qualifiedLeads / totalLeads) * 100
      : 0;
    const conversionRate = totalLeads ? (convertedLeads / totalLeads) * 100 : 0;

    const now = new Date();
    const openLeads = leads.filter(
      (l) => l.stage !== "Lost" && l.stage !== "Converted",
    );
    const pendingFollowUps = openLeads.filter((l) => l.nextFollowUpDate).length;
    const overdueFollowUps = openLeads.filter(
      (l) => l.nextFollowUpDate && new Date(l.nextFollowUpDate) < now,
    ).length;

    const pipelineByStage = STAGES.map((stage) => ({
      stage,
      count: leads.filter((l) => l.stage === stage).length,
    }));

    const sourceCounts = {};
    leads.forEach((l) => {
      sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    });
    const leadsBySource = Object.entries(sourceCounts).map(
      ([source, count]) => ({ source, count }),
    );

    const performanceMap = {};
    leads.forEach((l) => {
      const name = l.assignedTo?.name || "Unassigned";
      if (!performanceMap[name]) {
        performanceMap[name] = {
          salesperson: name,
          totalLeads: 0,
          converted: 0,
        };
      }
      performanceMap[name].totalLeads += 1;
      if (l.stage === "Converted") performanceMap[name].converted += 1;
    });
    const salesPerformance = Object.values(performanceMap)
      .filter((p) => p.salesperson !== "Unassigned")
      .map((p) => ({
        ...p,
        conversionRate: p.totalLeads ? (p.converted / p.totalLeads) * 100 : 0,
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads);

    // -----------------------------------------
    // Customers
    // -----------------------------------------

    const totalCustomers = await Client.countDocuments();

    // -----------------------------------------
    // Opportunities (Quotations)
    // -----------------------------------------

    const quotations =
      await Quotation.find(quotationFilter).select("status grandTotal");

    const totalOpportunities = quotations.length;
    const openOpportunities = quotations.filter((q) =>
      ["Draft", "Sent"].includes(q.status),
    ).length;
    const wonQuotations = quotations.filter((q) => q.status === "Approved");
    const lostOpportunities = quotations.filter(
      (q) => q.status === "Rejected",
    ).length;
    const wonOpportunities = wonQuotations.length;

    const winRate =
      wonOpportunities + lostOpportunities > 0
        ? (wonOpportunities / (wonOpportunities + lostOpportunities)) * 100
        : 0;

    const totalPipelineValue = quotations
      .filter((q) => ["Draft", "Sent"].includes(q.status))
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    const weightedPipeline = quotations
      .filter((q) => ["Draft", "Sent"].includes(q.status))
      .reduce(
        (sum, q) => sum + (q.grandTotal || 0) * (STAGE_WEIGHT[q.status] || 0),
        0,
      );

    const wonRevenue = wonQuotations.reduce(
      (sum, q) => sum + (q.grandTotal || 0),
      0,
    );
    const averageDealSize = wonOpportunities
      ? wonRevenue / wonOpportunities
      : 0;

    const statusValueMap = {};
    quotations.forEach((q) => {
      statusValueMap[q.status] =
        (statusValueMap[q.status] || 0) + (q.grandTotal || 0);
    });
    const opportunitiesByStatus = Object.entries(statusValueMap).map(
      ([status, value]) => ({ status, value }),
    );

    // -----------------------------------------
    // Invoices & Payments
    // -----------------------------------------

    const invoiceAgg = await Invoice.aggregate([
      { $match: invoiceFilter },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]);
    const totalInvoiced = invoiceAgg[0]?.total || 0;

    const paymentAgg = await Payment.aggregate([
      { $match: paymentFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPaid = paymentAgg[0]?.total || 0;

    const outstanding = totalInvoiced - totalPaid;

    // Monthly revenue (paid amounts) — last 12 months by default,
    // or across the requested range when one is given.
    const monthlyRevenueAgg = await Payment.aggregate([
      { $match: paymentFilter },
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const monthlyRevenue = monthlyRevenueAgg.map((r) => ({
      year: r._id.year,
      month: r._id.month,
      total: r.total,
    }));

    // -----------------------------------------
    // Response
    // -----------------------------------------

    res.status(200).json({
      success: true,
      dashboard: {
        totalLeads,
        newLeadsToday,
        qualifiedLeads,
        qualificationRate,
        convertedLeads,
        conversionRate,
        totalCustomers,
        openOpportunities,
        totalOpportunities,
        wonOpportunities,
        lostOpportunities,
        winRate,
        totalPipelineValue,
        weightedPipeline,
        wonRevenue,
        averageDealSize,
        totalInvoiced,
        totalPaid,
        outstanding,
        pendingFollowUps,
        overdueFollowUps,
        pipelineByStage,
        monthlyRevenue,
        leadsBySource,
        opportunitiesByStatus,
        salesPerformance,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getDashboard };

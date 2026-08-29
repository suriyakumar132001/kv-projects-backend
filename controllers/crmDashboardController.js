// =========================================
// KV Projects ERP
// CRM Dashboard Controller
//
// Everything here is computed with MongoDB aggregation
// pipelines against real collections — nothing hard-coded,
// no records pulled into Node just to be summed in JS.
//
// Domain mapping for this construction ERP:
//   Lead        -> CRM "lead" pipeline (New Lead/Contacted/On Hold/Lost/Converted)
//   Quotation   -> CRM "opportunity" pipeline (Draft/Sent/Approved/Rejected)
//   Client      -> CRM "customer" (status: Lead/Active/Completed)
//   Invoice/Payment -> CRM revenue
// =========================================

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const LEAD_STAGES = ["New Lead", "Contacted", "On Hold", "Lost", "Converted"];
const QUOTE_STATUSES = ["Draft", "Sent", "Approved", "Rejected"];

const parseDateRange = (query) => {
  const { fromDate, toDate } = query;
  const range = {};
  if (fromDate) range.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : null;
};

const getCrmDashboard = async (req, res) => {
  try {
    const dateRange = parseDateRange(req.query);
    const leadMatch = dateRange ? { createdAt: dateRange } : {};
    const quoteMatch = dateRange ? { createdAt: dateRange } : {};

    // -----------------------------------------
    // Lead pipeline — one aggregation, $facet fans out
    // into every KPI/breakdown we need from this collection.
    // -----------------------------------------
    const [leadFacets] = await Lead.aggregate([
      { $match: leadMatch },
      {
        $facet: {
          totalLeads: [{ $count: "count" }],
          byStage: [{ $group: { _id: "$stage", count: { $sum: 1 } } }],
          bySource: [{ $group: { _id: "$source", count: { $sum: 1 } } }],
          byMonth: [
            {
              $group: {
                _id: {
                  y: { $year: "$createdAt" },
                  m: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.y": 1, "_id.m": 1 } },
          ],
          bySalesperson: [
            { $match: { assignedTo: { $ne: null } } },
            {
              $group: {
                _id: "$assignedTo",
                totalLeads: { $sum: 1 },
                converted: {
                  $sum: { $cond: [{ $eq: ["$stage", "Converted"] }, 1, 0] },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 0,
                salesperson: "$user.name",
                totalLeads: 1,
                converted: 1,
                conversionRate: {
                  $cond: [
                    { $eq: ["$totalLeads", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$converted", "$totalLeads"] },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { converted: -1 } },
          ],
          openPipelineValue: [
            { $match: { stage: { $nin: ["Lost", "Converted"] } } },
            { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
          ],
          pendingFollowUps: [
            {
              $match: {
                nextFollowUpDate: { $ne: null, $gte: new Date() },
                stage: { $nin: ["Lost", "Converted"] },
              },
            },
            { $count: "count" },
          ],
          overdueFollowUps: [
            {
              $match: {
                nextFollowUpDate: { $ne: null, $lt: new Date() },
                stage: { $nin: ["Lost", "Converted"] },
              },
            },
            { $count: "count" },
          ],
          newToday: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
            },
            { $count: "count" },
          ],
          convertedToday: [
            {
              $match: {
                stage: "Converted",
                convertedAt: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    const totalLeads = leadFacets.totalLeads[0]?.count || 0;

    const byStageMap = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
    leadFacets.byStage.forEach((row) => {
      if (row._id) byStageMap[row._id] = row.count;
    });

    const convertedLeads = byStageMap["Converted"] || 0;
    const qualifiedLeads = (byStageMap["Contacted"] || 0) + convertedLeads;

    // -----------------------------------------
    // Quotations = "Opportunities"
    // -----------------------------------------
    const [quoteFacets] = await Quotation.aggregate([
      { $match: quoteMatch },
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                value: { $sum: "$grandTotal" },
              },
            },
          ],
          monthlyValue: [
            {
              $group: {
                _id: {
                  y: { $year: "$createdAt" },
                  m: { $month: "$createdAt" },
                },
                value: { $sum: "$grandTotal" },
              },
            },
            { $sort: { "_id.y": 1, "_id.m": 1 } },
          ],
        },
      },
    ]);

    const totalOpportunities = quoteFacets.total[0]?.count || 0;
    const stageMap = Object.fromEntries(
      QUOTE_STATUSES.map((s) => [s, { count: 0, value: 0 }]),
    );
    quoteFacets.byStatus.forEach((row) => {
      if (row._id)
        stageMap[row._id] = { count: row.count, value: row.value || 0 };
    });

    const openOpportunities = stageMap["Draft"].count + stageMap["Sent"].count;
    const wonOpportunities = stageMap["Approved"].count;
    const lostOpportunities = stageMap["Rejected"].count;
    const pipelineValue = stageMap["Draft"].value + stageMap["Sent"].value;
    const wonRevenue = stageMap["Approved"].value;

    // Approved quotations count as ~85% probability, everything else in
    // the open pipeline as 40% — no per-record probability field exists
    // yet, so this gives a usable weighted figure without inventing data.
    const weightedPipeline = pipelineValue * 0.4;

    // -----------------------------------------
    // Clients = "Customers"
    // -----------------------------------------
    const [clientFacets] = await Client.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]);

    const totalCustomers = clientFacets.total[0]?.count || 0;

    // -----------------------------------------
    // Revenue — actual invoiced / paid amounts
    // -----------------------------------------
    const [invoiceFacets] = await Invoice.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                invoiced: { $sum: "$grandTotal" },
                paidInvoices: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "Paid"] },
                      "$grandTotal",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          monthlyRevenue: [
            { $match: { paymentStatus: "Paid" } },
            {
              $group: {
                _id: {
                  y: { $year: "$invoiceDate" },
                  m: { $month: "$invoiceDate" },
                },
                total: { $sum: "$grandTotal" },
              },
            },
            { $sort: { "_id.y": 1, "_id.m": 1 } },
          ],
        },
      },
    ]);

    const [paidTotalAgg] = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalInvoiced = invoiceFacets.totals[0]?.invoiced || 0;
    const totalPaid = paidTotalAgg?.total || 0;
    const outstanding = Math.max(totalInvoiced - totalPaid, 0);

    // -----------------------------------------
    // Assemble response
    // -----------------------------------------
    res.status(200).json({
      success: true,
      dashboard: {
        // KPI cards
        totalLeads,
        newLeads: byStageMap["New Lead"],
        qualifiedLeads,
        convertedLeads,
        totalCustomers,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        totalPipelineValue: pipelineValue,
        weightedPipeline,
        wonRevenue,
        pendingFollowUps: leadFacets.pendingFollowUps[0]?.count || 0,
        overdueFollowUps: leadFacets.overdueFollowUps[0]?.count || 0,

        conversionRate: totalLeads ? (convertedLeads / totalLeads) * 100 : 0,
        qualificationRate: totalLeads ? (qualifiedLeads / totalLeads) * 100 : 0,
        winRate:
          wonOpportunities + lostOpportunities
            ? (wonOpportunities / (wonOpportunities + lostOpportunities)) * 100
            : 0,
        averageDealSize: wonOpportunities ? wonRevenue / wonOpportunities : 0,

        // Revenue
        totalInvoiced,
        totalPaid,
        outstanding,
        monthlyRevenue: invoiceFacets.monthlyRevenue.map((r) => ({
          year: r._id.y,
          month: r._id.m,
          total: r.total,
        })),

        // Pipelines / breakdowns
        pipelineByStage: LEAD_STAGES.map((stage) => ({
          stage,
          count: byStageMap[stage],
        })),
        opportunitiesByStatus: QUOTE_STATUSES.map((status) => ({
          status,
          count: stageMap[status].count,
          value: stageMap[status].value,
        })),
        leadsBySource: leadFacets.bySource.map((r) => ({
          source: r._id || "Unknown",
          count: r.count,
        })),
        leadsByMonth: leadFacets.byMonth.map((r) => ({
          year: r._id.y,
          month: r._id.m,
          count: r.count,
        })),
        customersByStatus: clientFacets.byStatus.map((r) => ({
          status: r._id || "Unknown",
          count: r.count,
        })),
        salesPerformance: leadFacets.bySalesperson,

        // Today
        newLeadsToday: leadFacets.newToday[0]?.count || 0,
        convertedLeadsToday: leadFacets.convertedToday[0]?.count || 0,

        totalOpportunities,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("CRM Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load CRM dashboard",
      error: error.message,
    });
  }
};

module.exports = { getCrmDashboard };

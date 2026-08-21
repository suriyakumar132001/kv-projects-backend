const cron = require("node-cron");
const Invoice = require("../models/Invoice");
const Lead = require("../models/Lead");
const User = require("../models/User");
const {
  createNotificationForMany,
} = require("../services/notificationService");

function startNotificationCron() {
  // Runs daily at 8 AM
  cron.schedule("0 8 * * *", async () => {
    try {
      const overdueInvoices = await Invoice.find({
        status: { $ne: "Paid" },
        dueDate: { $lt: new Date() },
      });
      if (overdueInvoices.length === 0) return;

      const admins = await User.find({
        role: { $in: ["Owner", "Admin", "Accountant"] },
      }).select("_id");
      const adminIds = admins.map((a) => a._id);

      for (const invoice of overdueInvoices) {
        await createNotificationForMany(adminIds, {
          type: "overdue_invoice",
          title: "Overdue Invoice",
          message: `Invoice #${invoice.invoiceNumber} is overdue`,
          link: `/invoices/${invoice._id}`,
          relatedModel: "Invoice",
          relatedId: invoice._id,
        });
      }
    } catch (err) {
      console.error("Notification cron error:", err.message);
    }
  });

  // Runs daily at 8 AM — leads whose follow-up is due today or overdue,
  // and still sitting in an open pipeline stage.
  cron.schedule("0 8 * * *", async () => {
    try {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const dueLeads = await Lead.find({
        nextFollowUpDate: { $lte: endOfToday, $ne: null },
        stage: { $nin: ["Lost", "Converted"] },
      }).populate("assignedTo", "_id");
      if (dueLeads.length === 0) return;

      const owners = await User.find({
        role: { $in: ["owner", "admin"] },
      }).select("_id");
      const ownerIds = owners.map((u) => u._id.toString());

      for (const lead of dueLeads) {
        const recipientIds = new Set(ownerIds);
        if (lead.assignedTo?._id) recipientIds.add(lead.assignedTo._id.toString());

        const overdue = lead.nextFollowUpDate < new Date();

        await createNotificationForMany([...recipientIds], {
          type: "lead_followup",
          title: overdue ? "Follow-up Overdue" : "Follow-up Due Today",
          message: `${lead.leadName} (${lead.companyName || "no company"}) needs a follow-up`,
          link: `/leads/view/${lead._id}`,
          relatedModel: "Lead",
          relatedId: lead._id,
        });
      }
    } catch (err) {
      console.error("Lead follow-up cron error:", err.message);
    }
  });
}

module.exports = startNotificationCron;

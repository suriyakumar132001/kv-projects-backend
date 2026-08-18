const cron = require("node-cron");
const Invoice = require("../models/Invoice");
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
}

module.exports = startNotificationCron;

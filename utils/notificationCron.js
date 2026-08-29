const cron = require("node-cron");
const Invoice = require("../models/Invoice");
const User = require("../models/User");
const {
  createNotificationForMany,
} = require("../services/notificationService");
const sendWhatsApp = require("./sendWhatsApp");

function startNotificationCron() {
  // Runs daily at 8 AM
  cron.schedule("0 8 * * *", async () => {
    try {
      const overdueInvoices = await Invoice.find({
        status: { $ne: "Paid" },
        dueDate: { $lt: new Date() },
      }).populate("client", "clientName phone");
      if (overdueInvoices.length === 0) return;

      // NOTE: role values are lowercase on the User model
      // ("owner"/"admin"/"accountant") — this previously queried
      // "Owner"/"Admin"/"Accountant" and matched nobody, so admins were
      // never actually notified of overdue invoices. Fixed here.
      const admins = await User.find({
        role: { $in: ["owner", "admin", "accountant"] },
      }).select("_id phone");
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

        // Fire-and-forget WhatsApp nudges — admins get a heads-up,
        // the client gets a payment reminder. Never blocks the cron.
        admins.forEach((admin) => {
          if (admin.phone) {
            sendWhatsApp({
              to: admin.phone,
              body: `Invoice #${invoice.invoiceNumber} is overdue (due ${new Date(
                invoice.dueDate,
              ).toLocaleDateString("en-IN")}). Check the ERP for details.`,
            });
          }
        });

        if (invoice.client?.phone) {
          sendWhatsApp({
            to: invoice.client.phone,
            body: `Dear ${invoice.client.clientName || "Customer"}, invoice #${
              invoice.invoiceNumber
            } was due on ${new Date(invoice.dueDate).toLocaleDateString(
              "en-IN",
            )} and is still pending. Please arrange payment at the earliest. — KV Projects`,
          });
        }
      }
    } catch (err) {
      console.error("Notification cron error:", err.message);
    }
  });
}

module.exports = startNotificationCron;

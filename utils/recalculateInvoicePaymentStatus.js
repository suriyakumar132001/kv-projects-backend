const Payment = require("../models/Payment");

const recalculateInvoicePaymentStatus = async (invoice) => {
  const payments = await Payment.find({ invoice: invoice._id }).select(
    "amount",
  );
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (totalPaid >= invoice.grandTotal) {
    invoice.paymentStatus = "Paid";
  } else if (totalPaid > 0) {
    invoice.paymentStatus = "Partial";
  } else {
    invoice.paymentStatus = "Pending";
  }

  await invoice.save();
  return invoice;
};

module.exports = recalculateInvoicePaymentStatus;
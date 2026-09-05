const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const recalculateInvoicePaymentStatus = require(
  "../utils/recalculateInvoicePaymentStatus",
);

const getRazorpayClient = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

const getInvoicePaymentsTotal = async (invoiceId) => {
  const payments = await Payment.find({ invoice: invoiceId }).select("amount");
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

const isValidSignature = (orderId, paymentId, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(signature, "utf8");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const isValidWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const actual = Buffer.from(signature, "utf8");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const createPaymentRecord = async ({
  invoice,
  orderId,
  paymentId,
  signature,
  amount,
}) => {
  const existingPayment = await Payment.findOne({
    razorpayPaymentId: paymentId,
  });
  if (existingPayment) return existingPayment;

  const payment = await Payment.create({
    invoice: invoice._id,
    client: invoice.client,
    amount: amount / 100,
    paymentMethod: "Razorpay",
    transactionId: paymentId,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  });

  await recalculateInvoicePaymentStatus(invoice);
  return payment;
};

const createOrder = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!mongoose.isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "A valid invoiceId is required.",
      });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      client: req.client._id,
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }
    if (invoice.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "This invoice has already been paid.",
      });
    }

    const totalPaid = await getInvoicePaymentsTotal(invoice._id);
    const outstanding = invoice.grandTotal - totalPaid;
    const amount = Math.round(outstanding * 100);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "This invoice has no outstanding balance.",
      });
    }

    const order = await getRazorpayClient().orders.create({
      amount,
      currency: "INR",
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: String(invoice._id),
        clientId: String(invoice.client),
      },
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to start the payment. Please try again.",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      invoiceId,
    } = req.body;

    if (!orderId || !paymentId || !signature || !mongoose.isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Complete Razorpay payment details are required.",
      });
    }
    if (!isValidSignature(orderId, paymentId, signature)) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
      });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      client: req.client._id,
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    const razorpay = getRazorpayClient();
    const [order, paymentDetails] = await Promise.all([
      razorpay.orders.fetch(orderId),
      razorpay.payments.fetch(paymentId),
    ]);
    if (
      order.id !== orderId ||
      order.receipt !== invoice.invoiceNumber ||
      paymentDetails.order_id !== orderId ||
      Number(paymentDetails.amount) !== Number(order.amount) ||
      !["authorized", "captured"].includes(paymentDetails.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details could not be verified.",
      });
    }
    const outstanding = invoice.grandTotal - await getInvoicePaymentsTotal(invoice._id);
    if (Number(order.amount) > Math.round(outstanding * 100)) {
      return res.status(400).json({
        success: false,
        message: "This invoice balance has changed. Please start the payment again.",
      });
    }

    const payment = await createPaymentRecord({
      invoice,
      orderId,
      paymentId,
      signature,
      amount: order.amount,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      payment,
    });
  } catch (error) {
    console.error("Razorpay payment verification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify the payment. Please contact support.",
    });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const signature = req.get("x-razorpay-signature");
    if (!signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ success: false, message: "Invalid webhook." });
    }

    if (!isValidWebhookSignature(req.body, signature)) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature." });
    }

    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event !== "payment.captured") return res.status(200).json({ success: true });

    const entity = event.payload?.payment?.entity;
    if (!entity?.id || !entity.order_id) {
      return res.status(400).json({ success: false, message: "Invalid payment event." });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.fetch(entity.order_id);
    const invoice = await Invoice.findOne({ invoiceNumber: order.receipt });
    if (!invoice || Number(entity.amount) !== Number(order.amount)) {
      return res.status(400).json({ success: false, message: "Invoice payment could not be matched." });
    }
    const outstanding = invoice.grandTotal - await getInvoicePaymentsTotal(invoice._id);
    if (Number(order.amount) > Math.round(outstanding * 100)) {
      return res.status(400).json({ success: false, message: "Invoice balance has already changed." });
    }

    await createPaymentRecord({
      invoice,
      orderId: entity.order_id,
      paymentId: entity.id,
      signature,
      amount: order.amount,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error.message);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};

module.exports = { createOrder, verifyPayment, handleWebhook };
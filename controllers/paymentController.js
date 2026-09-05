const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const recalculateInvoicePaymentStatus = require(
  "../utils/recalculateInvoicePaymentStatus",
);

// =====================================
// Create Payment
// =====================================

const createPayment = async (req, res) => {
  try {

    const payment = await Payment.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const invoice = await Invoice.findById(payment.invoice);

    if (invoice) {
      await recalculateInvoicePaymentStatus(invoice);
    }

    res.status(201).json({
      success: true,
      message: "Payment Added Successfully",
      payment,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Payments
// =====================================

const getPayments = async (req, res) => {
  try {

    const payments = await Payment.find()
      .populate("invoice", "invoiceNumber grandTotal paymentStatus")
      .populate("client", "clientName companyName")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get Single Payment
// =====================================

const getPayment = async (req, res) => {
  try {

    const payment = await Payment.findById(req.params.id)
      .populate("invoice")
      .populate("client")
      .populate("createdBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Update Payment
// =====================================

const updatePayment = async (req, res) => {
  try {

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Payment Updated Successfully",
      payment: updatedPayment,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Delete Payment
// =====================================

const deletePayment = async (req, res) => {
  try {

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await payment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Payment Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
};
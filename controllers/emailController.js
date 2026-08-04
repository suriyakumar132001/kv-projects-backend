const puppeteer = require("puppeteer");
const Invoice = require("../models/Invoice");
const invoiceTemplate = require("../templates/invoiceTemplate");
const sendEmail = require("../utils/sendEmail");

const sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client")
      .populate("quotation")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Generate HTML
    const html = invoiceTemplate(invoice);

    // Launch Browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF Buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Send Email
    await sendEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `
        <h2>KV Projects ERP</h2>

        <p>Dear ${invoice.client.clientName},</p>

        <p>Please find your invoice attached.</p>

        <p>Invoice No: <b>${invoice.invoiceNumber}</b></p>

        <p>Project: <b>${invoice.projectName}</b></p>

        <br>

        <p>Thank you.</p>
      `,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Invoice emailed successfully",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendInvoiceEmail,
};
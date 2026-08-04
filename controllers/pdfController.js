const puppeteer = require("puppeteer");
const Invoice = require("../models/Invoice");
const invoiceTemplate = require("../templates/invoiceTemplate");

const generateInvoicePDF = async (req, res) => {
  let browser;

  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client")
      .populate({
        path: "quotation",
        populate: {
          path: "client",
        },
      })
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const html = invoiceTemplate(invoice);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // Don't wait for networkidle0
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoice.invoiceNumber}.pdf`,
    );

    return res.end(pdfBuffer);
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  generateInvoicePDF,
};

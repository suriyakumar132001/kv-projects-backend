const puppeteer = require("puppeteer");
const Invoice = require("../models/Invoice");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const invoiceTemplate = require("../templates/invoiceTemplate");
const payslipTemplate = require("../templates/payslipTemplate");

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

const generatePayslipPDF = async (req, res) => {
  let browser;

  try {
    const employee = await Employee.findOne({ user: req.user._id });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No employee record linked to your account.",
      });
    }

    const payslip = await Payroll.findById(req.params.id)
      .populate("employee", "employeeId name department designation")
      .populate("createdBy", "name");

    if (!payslip || String(payslip.employee?._id) !== String(employee._id)) {
      return res.status(404).json({
        success: false,
        message: "Payslip not found",
      });
    }

    const html = payslipTemplate(payslip);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

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
      `inline; filename=${payslip.employee?.employeeId || "payslip"}.pdf`,
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
  generatePayslipPDF,
};

// ===============================================
// KV Projects ERP
// app.js
// ===============================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");


// ===============================================
// Import Routes
// ===============================================

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const siteRoutes = require("./routes/siteRoutes");
const dprRoutes = require("./routes/dprRoutes");
const materialRoutes = require("./routes/materialRoutes");
const labourRoutes = require("./routes/labourRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const grnRoutes = require("./routes/grnRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const materialIssueRoutes = require("./routes/materialIssueRoutes");
const employeeRoutes=require("./routes/employeeRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const taskRoutes = require("./routes/taskRoutes");
const assetRoutes = require("./routes/assetRoutes");
const clientRoutes = require("./routes/clientRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const emailRoutes = require("./routes/emailRoutes");
const projectRoutes = require("./routes/projectRoutes");
// ===============================================
// Create Express App
// ===============================================

const app = express();

// ===============================================
// Middlewares
// ===============================================

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// ===============================================
// Static Folder (Uploaded Images)
// ===============================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ===============================================
// API Routes
// ===============================================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/dpr", dprRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/labours", labourRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/material-issues", materialIssueRoutes);
app.use("/api/employees",employeeRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/email", emailRoutes);

// ===============================================
// Default Route
// ===============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Welcome to KV Projects ERP API",
  });
});

// ===============================================
// 404 Route
// ===============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

// ===============================================
// Export App
// ===============================================

module.exports = app;
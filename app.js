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
const employeeRoutes = require("./routes/employeeRoutes");
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
const leadRoutes = require("./routes/leadRoutes");
const crmRoutes = require("./routes/crmRoutes");

// ===============================================
// Client Portal Routes
// ===============================================
//
// Three separate route files, deliberately not merged
// into the staff routes above:
//   - clientAuthRoutes:        client login / password reset (public)
//   - clientPortalRoutes:      client-facing data (protectClient)
//   - clientPortalAdminRoutes: staff-only activate/deactivate access
// ===============================================

const clientAuthRoutes = require("./routes/clientAuthRoutes");
const clientPortalRoutes = require("./routes/clientPortalRoutes");
const clientPortalAdminRoutes = require("./routes/clientPortalAdminRoutes");

// ===============================================
// Create Express App
// ===============================================

const app = express();

// ===============================================
// Security & Core Middleware
// ===============================================

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

app.use(cookieParser());

// ===============================================
// Static Files
// ===============================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================================
// Health Check
// ===============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "KV Projects ERP API is running",
    timestamp: new Date().toISOString(),
  });
});

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

app.use("/api/employees", employeeRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/payroll", payrollRoutes);

app.use("/api/leaves", leaveRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/assets", assetRoutes);

app.use("/api/clients", clientRoutes);

app.use("/api/leads", leadRoutes);

app.use("/api/crm", crmRoutes);

// Mounted alongside clientRoutes on the same prefix —
// adds /:id/activate-portal and /:id/deactivate-portal
// without touching clientRoutes.js itself.
app.use("/api/clients", clientPortalAdminRoutes);

app.use("/api/quotations", quotationRoutes);

app.use("/api/invoices", invoiceRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/budgets", budgetRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/pdf", pdfRoutes);

app.use("/api/email", emailRoutes);

// Client portal — separate auth domain from everything above
app.use("/api/client-auth", clientAuthRoutes);

app.use("/api/client-portal", clientPortalRoutes);

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
// 404 Handler
// ===============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
    path: req.originalUrl,
  });
});

// ===============================================
// Global Error Handler
// ===============================================

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ===============================================
// Export App
// ===============================================

module.exports = app;

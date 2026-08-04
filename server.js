// ===============================================
// KV Projects ERP
// server.js
// ===============================================

// Load Environment Variables
require("dotenv").config();

// Import Express App
const app = require("./app");

// Import Database Connection
const connectDB = require("./config/db");

// Connect Database
connectDB();

// Read Port
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
// ===============================================
// KV Projects ERP
// server.js
// ===============================================

// ===============================================
// Load Environment Variables
// ===============================================

require("dotenv").config();

// ===============================================
// Imports
// ===============================================

const app = require("./app");
const connectDB = require("./config/db");

// ===============================================
// Configuration
// ===============================================

const PORT = process.env.PORT || 5000;

// ===============================================
// Start Server
// ===============================================

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    // Start Express
    app.listen(PORT, () => {
      console.log("");
      console.log("======================================");
      console.log("🚀 KV Projects ERP Backend");
      console.log("======================================");
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`❤️ Health: http://localhost:${PORT}/health`);
      console.log(`📁 API:    http://localhost:${PORT}/api`);
      console.log("======================================");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Server startup failed:");

    console.error(error);

    process.exit(1);
  }
};

// ===============================================
// Start Application
// ===============================================

startServer();

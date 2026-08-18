// =========================================
// KV Projects ERP
// Client Portal Auth Routes
// =========================================

const express = require("express");

const router = express.Router();

const {
  clientLogin,
  clientForgotPassword,
  clientResetPassword,
} = require("../controllers/clientAuthController");

router.post("/login", clientLogin);

router.post("/forgot-password", clientForgotPassword);

router.put("/reset-password/:token", clientResetPassword);

module.exports = router;

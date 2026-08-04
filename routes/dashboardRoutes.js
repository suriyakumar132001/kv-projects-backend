const express=require("express");

const router=express.Router();

const protect=require("../middleware/authMiddleware");

const authorize=require("../middleware/roleMiddleware");

const {ownerDashboard}=require("../controllers/dashboardController");

// Owner Only

router.get(

"/owner",

protect,

authorize("owner"),

ownerDashboard

);

module.exports=router;
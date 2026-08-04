const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
{
    employeeId:{
        type:String,
        required:true,
        unique:true,
    },

    name:{
        type:String,
        required:true,
        trim:true,
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
    },

    phone:{
        type:String,
        required:true,
    },

    department:{
        type:String,
        required:true,
    },

    designation:{
        type:String,
        required:true,
    },

    salary:{
        type:Number,
        required:true,
    },

    joiningDate:{
        type:Date,
        required:true,
    },

    status:{
        type:String,
        enum:["Active","Inactive"],
        default:"Active",
    },

    address:{
        type:String,
        default:"",
    },

    emergencyContact:{
        type:String,
        default:"",
    },

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    }

},
{
    timestamps:true,
});

module.exports=mongoose.model("Employee",employeeSchema);
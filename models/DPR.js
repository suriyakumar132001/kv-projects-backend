const mongoose = require("mongoose");

const dprSchema = new mongoose.Schema(
{
    site:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Site",
        required:true
    },

    siteEngineer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    reportDate:{
        type:Date,
        default:Date.now
    },

    weather:{
        type:String,
        enum:["Sunny","Cloudy","Rainy"],
        default:"Sunny"
    },

    labour:{

        mason:{
            type:Number,
            default:0
        },

        helper:{
            type:Number,
            default:0
        },

        carpenter:{
            type:Number,
            default:0
        },

        electrician:{
            type:Number,
            default:0
        },

        plumber:{
            type:Number,
            default:0
        },

        painter:{
            type:Number,
            default:0
        }

    },

    materials:{

        cement:{
            type:Number,
            default:0
        },

        steel:{
            type:Number,
            default:0
        },

        sand:{
            type:Number,
            default:0
        },

        bricks:{
            type:Number,
            default:0
        },

        jelly:{
            type:Number,
            default:0
        }

    },

    progress:{
        type:Number,
        default:0
    },

    workDescription:{
        type:String,
        required:true
    },

    tomorrowPlan:{
        type:String,
        default:""
    },

    issues:{
        type:String,
        default:""
    },

    remarks:{
        type:String,
        default:""
    },

    images:[
        {
            type:String
        }
    ]

},
{
    timestamps:true
});

module.exports=mongoose.model("DPR",dprSchema);
const ownerDashboard = async (req, res) => {

    res.json({

        success:true,

        message:"Welcome Owner",

        user:req.user

    })

}

const adminDashboard = async (req, res) => {

    res.json({

        success:true,

        message:"Welcome Admin",

        user:req.user

    })

}

const hrDashboard = async (req, res) => {

    res.json({

        success:true,

        message:"Welcome HR",

        user:req.user

    })

}

const siteEngineerDashboard = async (req, res) => {

    res.json({

        success:true,

        message:"Welcome Site Engineer",

        user:req.user

    })

}

module.exports={
    ownerDashboard,
    adminDashboard,
    hrDashboard,
    siteEngineerDashboard
}
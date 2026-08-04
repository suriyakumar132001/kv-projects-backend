const ownerDashboard = async (req, res) => {

    res.json({

        success:true,

        message:"Welcome Owner",

        user:req.user

    })

}

module.exports={
    ownerDashboard
}
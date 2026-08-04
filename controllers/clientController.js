const Client = require("../models/Client");

// =====================================
// Create Client
// =====================================

const createClient = async (req, res) => {
  try {

    const client = await Client.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Client Created Successfully",
      client,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =====================================
// Get All Clients
// =====================================

const getClients = async (req, res) => {

  try {

    const clients = await Client.find()
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      count: clients.length,
      clients,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Get Single Client
// =====================================

const getClient = async (req, res) => {

  try {

    const client = await Client.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      client,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Update Client
// =====================================

const updateClient = async (req, res) => {

  try {

    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Client Updated Successfully",
      client: updatedClient,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

// =====================================
// Delete Client
// =====================================

const deleteClient = async (req, res) => {

  try {

    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: "Client Deleted Successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
};
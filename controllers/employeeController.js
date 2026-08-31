const fs = require("fs");
const path = require("path");

const Employee = require("../models/Employee");

// =====================================
// Create Employee
// =====================================

const createEmployee = async (req, res) => {
  try {
    const { faceDescriptor, ...rest } = req.body;

    const employeeData = {
      ...rest,
      createdBy: req.user._id,
    };

    // Optional: face captured directly on the Add Employee form (see
    // FaceCapture in EmployeeForm.jsx). Same validation as enrollFace() —
    // a malformed/missing descriptor is simply ignored rather than
    // blocking employee creation.
    if (
      Array.isArray(faceDescriptor) &&
      faceDescriptor.length === 128 &&
      faceDescriptor.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      employeeData.faceDescriptor = faceDescriptor;
      employeeData.faceEnrolledAt = new Date();
    }

    const employee = await Employee.create(employeeData);

    res.status(201).json({
      success: true,
      message: "Employee Created Successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get All Employees
// Search + Filter + Pagination
// =====================================

const getEmployees = async (req, res) => {
  try {
    const {
      search,
      department,
      designation,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Search by Name or Email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by Department
    if (department) {
      query.department = department;
    }

    // Filter by Designation
    if (designation) {
      query.designation = designation;
    }

    // Filter by Status
    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query)
      .select("-faceDescriptor")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Employee.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: employees.length,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get Single Employee
// =====================================

const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select("-faceDescriptor")
      .populate("createdBy", "name email");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Update Employee
// =====================================

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Employee Updated Successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Delete Employee
// =====================================

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await employee.deleteOne();

    res.status(200).json({
      success: true,
      message: "Employee Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Get My Employee Profile
// (any logged-in user — used by Site Engineer's
//  self-only Mark Attendance screen)
// =====================================

const getMyEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id }).select(
      "-faceDescriptor",
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "No employee profile is linked to your account yet. Contact your Admin/Owner.",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Enroll / Re-enroll Face
// =====================================
//
// Accepts a 128-number face descriptor computed in the browser
// (face-api.js) during enrollment — see FaceCapture on the
// Add/Edit Employee forms. Overwrites any existing descriptor,
// so re-enrolling (e.g. after a bad capture) is just calling
// this again.
// =====================================

const enrollFace = async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (
      !Array.isArray(descriptor) ||
      descriptor.length !== 128 ||
      !descriptor.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid face descriptor. Please capture the face again.",
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.faceDescriptor = descriptor;
    employee.faceEnrolledAt = new Date();

    await employee.save();

    // Re-fetch with the same exclusion every other employee endpoint
    // uses — .save() returns the full in-memory doc including the
    // descriptor we just set, which should never reach the frontend.
    const safeEmployee = await Employee.findById(employee._id).select(
      "-faceDescriptor",
    );

    res.status(200).json({
      success: true,
      message: "Face enrolled successfully",
      employee: safeEmployee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Remove Enrolled Face
// =====================================
//
// Clears the stored descriptor so the employee shows as
// "not enrolled" again — check-ins for them will simply skip
// face verification (faceVerified: null) until re-enrolled.
// =====================================

const removeFace = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.faceDescriptor = null;
    employee.faceEnrolledAt = null;

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Face enrollment removed",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Upload / Replace Profile Photo
// =====================================
//
// multer (config/multer.js) has already validated the file type/size
// and saved it to disk by the time this runs — req.file.path is the
// on-disk location. This just records the reference and cleans up
// whatever photo it's replacing, if any.
// =====================================

const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No photo file received.",
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      // Clean up the just-uploaded file — nothing will reference it.
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const oldPhotoPath = employee.profilePhoto;

    // multer's destination is configured as "uploads/" (relative to the
    // project root, i.e. where the process is started) — store the
    // same relative path so it lines up with how app.js serves
    // /uploads as static files.
    employee.profilePhoto = req.file.path.replace(/\\/g, "/");

    await employee.save();

    // Delete the old photo file only after the new one is safely
    // saved to the DB — if the save had failed we'd rather have an
    // orphaned old file than a broken reference.
    if (oldPhotoPath) {
      fs.unlink(path.resolve(oldPhotoPath), () => {});
    }

    const safeEmployee = await Employee.findById(employee._id).select(
      "-faceDescriptor",
    );

    res.status(200).json({
      success: true,
      message: "Employee photo updated successfully",
      employee: safeEmployee,
    });
  } catch (error) {
    // If we saved a file but something else failed, don't leave it
    // orphaned on disk.
    if (req.file) fs.unlink(req.file.path, () => {});

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================
// Remove Profile Photo
// =====================================

const removePhoto = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const oldPhotoPath = employee.profilePhoto;

    employee.profilePhoto = null;
    await employee.save();

    if (oldPhotoPath) {
      fs.unlink(path.resolve(oldPhotoPath), () => {});
    }

    res.status(200).json({
      success: true,
      message: "Employee photo removed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployee,
  getMyEmployee,
  updateEmployee,
  deleteEmployee,
  enrollFace,
  removeFace,
  uploadPhoto,
  removePhoto,
};

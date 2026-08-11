const Employee = require("../models/Employee");
const generateEmployeeId = require("./generateEmployeeId");

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  hr: "HR",
  siteengineer: "Site Engineer",
};

// Creates a bare-bones Employee record linked to a User account, so every
// login also shows up in Employee/Attendance/Payroll. HR/Admin fill in
// salary, department, designation, etc. afterwards from the Employees page.
//
// Used by:
//   - authController.register (new users created via "Add User")
//   - userController.provisionEmployee (linking OLDER accounts that were
//     created before this feature existed)
//
// Best-effort — returns null (and logs) instead of throwing, so callers
// never get blocked by a duplicate-email or similar Employee-side error.
const provisionEmployeeForUser = async ({ user, phone, createdById }) => {
  try {
    // Already linked? Don't create a duplicate.
    const existing = await Employee.findOne({ user: user._id });
    if (existing) return existing;

    const employeeId = await generateEmployeeId();

    const employee = await Employee.create({
      employeeId,
      name: user.name,
      email: user.email,
      phone: phone || user.phone || "",
      department: ROLE_LABELS[user.role] || user.role,
      designation: ROLE_LABELS[user.role] || user.role,
      // salary/joiningDate use schema defaults (0 / today) — HR/Admin
      // sets the real salary from the Employee edit page.
      user: user._id,
      createdBy: createdById,
    });

    return employee;
  } catch (error) {
    console.error("Auto Employee provisioning failed:", error.message);
    return null;
  }
};

module.exports = provisionEmployeeForUser;
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
// Returns { employee, reason }. employee is null on failure, with a
// human-readable `reason` — so the "Create Profile" button can surface a
// useful message instead of a generic 500.
const provisionEmployeeForUser = async ({ user, phone, createdById }) => {
  try {
    // Already linked? Don't create a duplicate.
    const existingByUser = await Employee.findOne({ user: user._id });
    if (existingByUser) return { employee: existingByUser, reason: null };

    // Employee.email is unique. If an Employee with this email already
    // exists (e.g. added manually via the Employees page before this
    // account existed), a plain create() would throw a duplicate-key
    // error. Link the existing record instead of trying to duplicate it.
    const existingByEmail = await Employee.findOne({ email: user.email });

    if (existingByEmail) {
      if (
        existingByEmail.user &&
        String(existingByEmail.user) !== String(user._id)
      ) {
        return {
          employee: null,
          reason: `Email ${user.email} is already used by Employee ${existingByEmail.employeeId}, which is linked to a different account.`,
        };
      }

      existingByEmail.user = user._id;
      await existingByEmail.save();

      return { employee: existingByEmail, reason: null };
    }

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

    return { employee, reason: null };
  } catch (error) {
    console.error("Auto Employee provisioning failed:", error.message);
    return { employee: null, reason: error.message };
  }
};

module.exports = provisionEmployeeForUser;

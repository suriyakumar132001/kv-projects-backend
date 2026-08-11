const Employee = require("../models/Employee");

// Generates a unique employeeId like "EMP0001", "EMP0002", ...
// Retries on the rare chance of a collision (e.g. concurrent signups).
const generateEmployeeId = async () => {
  let employeeId;
  let exists = true;
  let attempt = 0;

  while (exists && attempt < 5) {
    const count = await Employee.countDocuments();
    const candidateNumber = count + 1 + attempt;
    employeeId = `EMP${String(candidateNumber).padStart(4, "0")}`;

    exists = await Employee.exists({ employeeId });
    attempt += 1;
  }

  if (exists) {
    // Extremely unlikely fallback — timestamp-based, still unique.
    employeeId = `EMP${Date.now()}`;
  }

  return employeeId;
};

module.exports = generateEmployeeId;
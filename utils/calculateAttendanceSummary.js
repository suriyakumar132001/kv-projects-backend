const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const getMonthIndex = (month) => {
  if (typeof month === "number" && Number.isInteger(month) && month >= 0 && month <= 11) {
    return month;
  }

  if (typeof month === "string") {
    const trimmed = month.trim().toLowerCase();

    if (trimmed in MONTH_INDEX) {
      return MONTH_INDEX[trimmed];
    }

    const numericMonth = Number(trimmed);
    if (Number.isInteger(numericMonth) && numericMonth >= 0 && numericMonth <= 11) {
      return numericMonth;
    }
  }

  return null;
};

const calculateOverlapDays = (fromDate, toDate, monthStart, monthEnd) => {
  const start = new Date(Math.max(new Date(fromDate).getTime(), monthStart.getTime()));
  const end = new Date(Math.min(new Date(toDate).getTime(), monthEnd.getTime()));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, diffInDays + 1);
};

const calculateAttendanceSummary = async ({ employeeId, month, year }) => {
  if (!employeeId || !month || !year) {
    const error = new Error("employeeId, month, and year are required");
    error.statusCode = 400;
    throw error;
  }

  const employeeExists = await Employee.findById(employeeId);

  if (!employeeExists) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  const monthIndex = getMonthIndex(month);

  if (monthIndex === null) {
    const error = new Error("Invalid month value");
    error.statusCode = 400;
    throw error;
  }

  const numericYear = Number(year);

  if (!Number.isInteger(numericYear)) {
    const error = new Error("Invalid year value");
    error.statusCode = 400;
    throw error;
  }

  const monthStart = new Date(numericYear, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(numericYear, monthIndex + 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(numericYear, monthIndex + 1, 0).getDate();

  const attendanceRecords = await Attendance.find({
    employee: employeeId,
    attendanceDate: {
      $gte: monthStart,
      $lte: monthEnd,
    },
  }).select("status overtimeHours workingHours");

  const daysPresent = attendanceRecords.reduce((sum, record) => {
    if (record.status === "Present") return sum + 1;
    if (record.status === "Half Day") return sum + 0.5;
    return sum;
  }, 0);

  const overtimeHours = attendanceRecords.reduce((sum, record) => {
    return sum + Number(record.overtimeHours || 0);
  }, 0);

  const approvedLeaves = await Leave.find({
    employee: employeeId,
    status: "Approved",
    fromDate: { $lte: monthEnd },
    toDate: { $gte: monthStart },
  }).select("fromDate toDate");

  const daysOnApprovedLeave = approvedLeaves.reduce((sum, leave) => {
    const overlapDays = calculateOverlapDays(
      leave.fromDate,
      leave.toDate,
      monthStart,
      monthEnd,
    );

    return sum + overlapDays;
  }, 0);

  const daysAbsent = Math.max(0, daysInMonth - daysPresent - daysOnApprovedLeave);

  return {
    daysInMonth,
    daysPresent,
    daysOnApprovedLeave,
    daysAbsent,
    overtimeHours,
  };
};

module.exports = calculateAttendanceSummary;

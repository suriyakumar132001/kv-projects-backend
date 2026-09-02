const payslipTemplate = (payslip) => {
  const employee = payslip.employee || {};
  const totalEarnings = Number(payslip.totalEarnings || 0);
  const totalDeductions = Number(payslip.totalDeductions || 0);
  const netSalary = Number(payslip.netSalary || 0);
  const overtimePay = Number(payslip.overtime || 0);
  const deductionRows = [
    ["PF", Number(payslip.pf || 0)],
    ["ESI", Number(payslip.esi || 0)],
    ["Professional Tax", Number(payslip.professionalTax || 0)],
    ["LOP Deduction", Number(payslip.lopDeduction || 0)],
  ];

  const earningsRows = [
    ["Basic Salary", Number(payslip.basicSalary || 0)],
    ["HRA", Number(payslip.hra || 0)],
    ["Allowance", Number(payslip.allowance || 0)],
    ["Overtime Pay", overtimePay],
    ["Bonus", Number(payslip.bonus || 0)],
  ];

  const rowHtml = (rows, isDeduction = false) => rows.map(([label, value]) => `
    <tr>
      <td>${label}</td>
      <td class="amount">₹ ${Number(value || 0).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Payslip - ${employee.name || "Employee"}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      background: #f5f7fb;
      color: #1f2937;
      padding: 28px;
    }
    .page {
      max-width: 980px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #dfe7f3;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
      color: white;
      padding: 30px 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand h1 {
      margin: 0 0 8px;
      font-size: 30px;
      letter-spacing: 0.5px;
    }
    .brand p {
      margin: 0;
      opacity: 0.9;
      line-height: 1.6;
      font-size: 14px;
    }
    .payslip-type {
      text-align: right;
    }
    .payslip-type h2 {
      margin: 0 0 8px;
      font-size: 26px;
      letter-spacing: 1px;
    }
    .payslip-type span {
      display: inline-block;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .content { padding: 30px 36px 12px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(140px, 1fr));
      gap: 18px;
      margin-bottom: 26px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .meta-box label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .meta-box strong {
      color: #0f172a;
      font-size: 15px;
    }
    .sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
      margin-bottom: 22px;
    }
    .section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }
    .section h3 {
      margin: 0;
      padding: 14px 16px;
      font-size: 15px;
      background: #eef4ff;
      border-bottom: 1px solid #dfe7f3;
      color: #1e3a8a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px 16px;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .amount {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    .totals {
      display: grid;
      grid-template-columns: repeat(3, minmax(160px, 1fr));
      gap: 16px;
      margin: 8px 0 20px;
    }
    .total-box {
      border-radius: 12px;
      padding: 18px 16px;
      border: 1px solid #e2e8f0;
    }
    .total-box.earnings { background: #effaf3; }
    .total-box.deductions { background: #fef3f2; }
    .total-box.net { background: #eff6ff; }
    .total-box span {
      display: block;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 10px;
      color: #475569;
      font-weight: 700;
    }
    .total-box strong {
      font-size: 22px;
      color: #0f172a;
    }
    .footer {
      padding: 0 36px 34px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      color: #475569;
      font-size: 13px;
    }
    .footer p { margin: 0; }
    .status {
      display: inline-block;
      background: ${payslip.paymentStatus === "Paid" ? "#16a34a" : "#f59e0b"};
      color: white;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <h1>KV Projects ERP</h1>
        <p>Payroll & Employee Management System</p>
        <p>Tirunelveli, Tamil Nadu</p>
      </div>
      <div class="payslip-type">
        <h2>PAYSLIP</h2>
        <span>${payslip.month || ""} ${payslip.year || ""}</span>
      </div>
    </div>

    <div class="content">
      <div class="meta-grid">
        <div class="meta-box">
          <label>Employee Name</label>
          <strong>${employee.name || "-"}</strong>
        </div>
        <div class="meta-box">
          <label>Employee ID</label>
          <strong>${employee.employeeId || "-"}</strong>
        </div>
        <div class="meta-box">
          <label>Department</label>
          <strong>${employee.department || "-"}</strong>
        </div>
        <div class="meta-box">
          <label>Status</label>
          <strong><span class="status">${payslip.paymentStatus || "Pending"}</span></strong>
        </div>
      </div>

      <div class="sections">
        <div class="section">
          <h3>Earnings</h3>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowHtml(earningsRows)}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Deductions</h3>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowHtml(deductionRows, true)}
            </tbody>
          </table>
        </div>
      </div>

      <div class="totals">
        <div class="total-box earnings">
          <span>Total Earnings</span>
          <strong>₹ ${totalEarnings.toLocaleString("en-IN")}</strong>
        </div>
        <div class="total-box deductions">
          <span>Total Deductions</span>
          <strong>₹ ${totalDeductions.toLocaleString("en-IN")}</strong>
        </div>
        <div class="total-box net">
          <span>Net Salary</span>
          <strong>₹ ${netSalary.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div class="sections">
        <div class="section">
          <h3>Attendance Summary</h3>
          <table>
            <tbody>
              <tr><td>Days in Month</td><td class="amount">${Number(payslip.daysInMonth || 0)}</td></tr>
              <tr><td>Days Present</td><td class="amount">${Number(payslip.daysPresent || 0)}</td></tr>
              <tr><td>Approved Leave</td><td class="amount">${Number(payslip.daysOnApprovedLeave || 0)}</td></tr>
              <tr><td>Days Absent</td><td class="amount">${Number(payslip.daysAbsent || 0)}</td></tr>
              <tr><td>Overtime Hours</td><td class="amount">${Number(payslip.overtimeHours || 0).toFixed(1)} hrs</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Key Notes</h3>
          <table>
            <tbody>
              <tr><td>Per Day Salary</td><td class="amount">₹ ${Number(payslip.perDaySalary || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td>LOP Deduction</td><td class="amount">₹ ${Number(payslip.lopDeduction || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td>Generated By</td><td class="amount">${payslip.createdBy?.name || "System"}</td></tr>
              <tr><td>Generated On</td><td class="amount">${new Date(payslip.createdAt || Date.now()).toLocaleDateString("en-IN")}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>KV Projects ERP</p>
      <p>Net Salary: ₹ ${netSalary.toLocaleString("en-IN")}</p>
    </div>
  </div>
</body>
</html>
`;
};

module.exports = payslipTemplate;

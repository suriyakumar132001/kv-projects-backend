// =========================================
// KV Projects ERP
// Labour bill calculation engine
// Recomputes every derived number server-side from the raw
// daily timesheet rows, so a tampered/buggy frontend total
// can never be saved as the real bill value.
//
// Formula (verified against the original spreadsheet):
//   manHours (per trade)  = headcount x netHours, per shift
//   manDays  (per trade)  = SUM(manHours across the whole period) / 8
//   billValue (per trade) = manDays x unitRate
//   grandTotal            = SUM(billValue across all trades)
// =========================================

const STANDARD_HOURS_PER_DAY = 8;

/**
 * @param {Array} dailyEntries - [{ slNo, date, rows: [...] }]
 * @param {Array} items - [{ itemName, uom, unitRate, previousBillQty, remarks }]
 *   itemName must be "MASON" or "HELPER" (case-insensitive) to be matched
 *   against the timesheet columns. Add more trades by extending both the
 *   timesheetRowSchema and TRADE_FIELDS below together.
 */
const TRADE_FIELDS = {
  MASON: "masonManHours",
  HELPER: "helperManHours",
};

function recalcLabourBill(dailyEntries = [], items = []) {
  // 1. Recompute each row's derived hours from its raw inputs,
  //    never trusting whatever the client sent for netHours/manHours.
  const cleanEntries = dailyEntries.map((entry) => {
    const rows = (entry.rows || []).map((row) => {
      const totalHours = Number(row.totalHours) || 0;
      const breakHours = Number(row.breakHours) || 0;
      const netHours = Math.max(totalHours - breakHours, 0);

      const masonCount = Number(row.masonCount) || 0;
      const helperCount = Number(row.helperCount) || 0;

      return {
        ...row,
        totalHours,
        breakHours,
        netHours,
        masonManHours: masonCount * netHours,
        helperManHours: helperCount * netHours,
      };
    });
    return { ...entry, rows };
  });

  // 2. Sum man-hours per trade across every row of every day.
  const manHoursByTrade = {};
  for (const entry of cleanEntries) {
    for (const row of entry.rows) {
      for (const [trade, field] of Object.entries(TRADE_FIELDS)) {
        manHoursByTrade[trade] =
          (manHoursByTrade[trade] || 0) + (row[field] || 0);
      }
    }
  }

  // 3. Turn each bill item into man-days x rate, using this period's
  //    summed hours for that trade (0 if the trade had no timesheet rows).
  let grandTotal = 0;
  const cleanItems = items.map((item, idx) => {
    const tradeKey = (item.itemName || "").trim().toUpperCase();
    const manHours = manHoursByTrade[tradeKey] || 0;
    const thisBillQty = Number((manHours / STANDARD_HOURS_PER_DAY).toFixed(3));
    const unitRate = Number(item.unitRate) || 0;
    const billValue = Number((thisBillQty * unitRate).toFixed(2));

    grandTotal += billValue;

    return {
      slNo: item.slNo ?? idx + 1,
      itemName: item.itemName,
      uom: item.uom || "M/days",
      unitRate,
      previousBillQty: Number(item.previousBillQty) || 0,
      thisBillQty,
      billValue,
      remarks: item.remarks || "",
    };
  });

  return {
    dailyEntries: cleanEntries,
    items: cleanItems,
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

module.exports = { recalcLabourBill, STANDARD_HOURS_PER_DAY, TRADE_FIELDS };

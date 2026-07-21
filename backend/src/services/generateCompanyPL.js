/**
 * services/generateCompanyPL.js
 *
 * Company-wide Profit & Loss for a given date range:
 *   Gross Profit = Total Revenue (Invoiced) - Direct Project Inputs (Actual Spend)
 *   Net Profit   = Gross Profit - (Non-Project Expenses + Taxes)
 *
 * Restricted in the controller layer to Main Admin/Director and
 * Accountant roles only (see middleware/rbac.js).
 */

const db = require('../config/db');
const { round2, toMoney } = require('./calculateProjectMetrics');

/**
 * @param {object} params
 * @param {string} params.startDate - 'YYYY-MM-DD'
 * @param {string} params.endDate   - 'YYYY-MM-DD'
 */
async function generateCompanyPL({ startDate, endDate }) {
  // --- Revenue: sum of invoices issued in range -----------------------
  const revenueRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_revenue,
            COALESCE(SUM(tax_amount), 0) AS invoice_tax_collected
     FROM client_invoices
     WHERE issued_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const totalRevenue = toMoney(revenueRes.rows[0].total_revenue);

  // --- Direct Project Inputs (Actual Spend across ALL projects, scoped
  //     to activity within the date range across the four cost streams) --
  const materialRes = await db.query(
    `SELECT COALESCE(SUM(total_cost), 0) AS v FROM project_inventory_allocations
     WHERE allocation_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const laborRes = await db.query(
    `SELECT COALESCE(SUM(wage_amount), 0) AS v FROM labor_logs
     WHERE work_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const logisticsRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM logistics_costs
     WHERE cost_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const complianceRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM compliance_costs
     WHERE issued_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );

  const directProjectInputs =
    toMoney(materialRes.rows[0].v) +
    toMoney(laborRes.rows[0].v) +
    toMoney(logisticsRes.rows[0].v) +
    toMoney(complianceRes.rows[0].v);

  const grossProfit = totalRevenue - directProjectInputs;

  // --- Non-project (overhead) expenses ---------------------------------
  const overheadRes = await db.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS v
     FROM erp_overheads
     WHERE expense_date BETWEEN $1 AND $2
     GROUP BY category`,
    [startDate, endDate]
  );
  const overheadByCategory = {};
  let totalOverheads = 0;
  for (const row of overheadRes.rows) {
    const v = toMoney(row.v);
    overheadByCategory[row.category] = v;
    totalOverheads += v;
  }

  // --- Taxes (estimated/filed/paid tax_records in range, plus invoice tax) --
  const taxRes = await db.query(
    `SELECT COALESCE(SUM(tax_due), 0) AS v FROM tax_records
     WHERE created_at::date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  const totalTaxes = toMoney(taxRes.rows[0].v);

  const netProfit = grossProfit - (totalOverheads + totalTaxes);

  return {
    period: { startDate, endDate },
    revenue: {
      totalRevenue: round2(totalRevenue),
      invoiceTaxCollected: round2(toMoney(revenueRes.rows[0].invoice_tax_collected)),
    },
    directProjectInputs: {
      materials: round2(toMoney(materialRes.rows[0].v)),
      labor: round2(toMoney(laborRes.rows[0].v)),
      logistics: round2(toMoney(logisticsRes.rows[0].v)),
      compliance: round2(toMoney(complianceRes.rows[0].v)),
      total: round2(directProjectInputs),
    },
    grossProfit: round2(grossProfit),
    nonProjectExpenses: {
      byCategory: overheadByCategory,
      total: round2(totalOverheads),
    },
    taxes: round2(totalTaxes),
    netProfit: round2(netProfit),
  };
}

module.exports = { generateCompanyPL };

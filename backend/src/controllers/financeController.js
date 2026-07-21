const db = require('../config/db');
const { generateCompanyPL } = require('../services/generateCompanyPL');

// GET /api/finance/pl?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Restricted to admin_director + accountant via route middleware.
async function getPL(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query params are required' });
    }
    const pl = await generateCompanyPL({ startDate, endDate });
    res.json(pl);
  } catch (err) {
    next(err);
  }
}

// POST /api/finance/overheads — non-project expense entry
async function addOverhead(req, res, next) {
  try {
    const { category, description, amount, expenseDate } = req.body;
    const { rows } = await db.query(
      `INSERT INTO erp_overheads (category, description, amount, expense_date, recorded_by)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5) RETURNING *`,
      [category, description, amount, expenseDate, req.user.id]
    );
    res.status(201).json({ overhead: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPL, addOverhead };

const db = require('../config/db');

// GET /api/workers
async function listWorkers(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, role_title, daily_rate, is_active FROM workers WHERE is_active = TRUE ORDER BY full_name`
    );
    res.json({ workers: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/workers
async function createWorker(req, res, next) {
  try {
    const { fullName, roleTitle, dailyRate, phone } = req.body;
    const { rows } = await db.query(
      `INSERT INTO workers (full_name, role_title, daily_rate, phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [fullName, roleTitle, dailyRate, phone]
    );
    res.status(201).json({ worker: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listWorkers, createWorker };

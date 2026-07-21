const db = require('../config/db');

// GET /api/projects/:projectId/labor
async function listLaborLogs(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await db.query(
      `SELECT l.*, w.full_name AS worker_name
       FROM labor_logs l JOIN workers w ON w.id = l.worker_id
       WHERE l.project_id = $1 ORDER BY l.work_date DESC`,
      [projectId]
    );
    res.json({ laborLogs: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:projectId/labor
async function createLaborLog(req, res, next) {
  try {
    const { projectId } = req.params;
    const { workerId, workDate, hoursWorked, wageAmount, paymentStatus } = req.body;
    const { rows } = await db.query(
      `INSERT INTO labor_logs (project_id, worker_id, work_date, hours_worked, wage_amount, payment_status, recorded_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'paid'),$7) RETURNING *`,
      [projectId, workerId, workDate, hoursWorked, wageAmount, paymentStatus, req.user.id]
    );
    res.status(201).json({ laborLog: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listLaborLogs, createLaborLog };

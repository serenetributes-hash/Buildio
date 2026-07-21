const db = require('../config/db');
const { calculateProjectMetrics } = require('../services/calculateProjectMetrics');
const { scrubMetricsForClient } = require('../middleware/rbac');

// GET /api/projects — dashboard list (Module A)
async function listProjects(req, res, next) {
  try {
    let query = `SELECT id, name, location, status, start_date, end_date, total_project_value
                 FROM projects`;
    const params = [];

    // Client role only ever sees their own project(s)
    if (req.user.roleName === 'client') {
      query += ` WHERE client_user_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(query, params);
    res.json({ projects: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/metrics — Module A drill-down
async function getProjectMetrics(req, res, next) {
  try {
    const { projectId } = req.params;
    const metrics = await calculateProjectMetrics(projectId);

    if (req.user.roleName === 'client') {
      return res.json(scrubMetricsForClient(metrics));
    }
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

// POST /api/projects
async function createProject(req, res, next) {
  try {
    const { name, clientUserId, location, totalProjectValue, budgetAllocationPct, startDate, endDate } = req.body;
    const { rows } = await db.query(
      `INSERT INTO projects
        (name, client_user_id, location, total_project_value, budget_allocation_pct, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,COALESCE($5,50.00),$6,$7,$8)
       RETURNING *`,
      [name, clientUserId || null, location, totalProjectValue, budgetAllocationPct, startDate, endDate, req.user.id]
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProjects, getProjectMetrics, createProject };

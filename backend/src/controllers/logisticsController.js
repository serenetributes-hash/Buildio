const db = require('../config/db');

// GET /api/projects/:projectId/logistics
async function listLogistics(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM logistics_costs WHERE project_id = $1 ORDER BY cost_date DESC`,
      [projectId]
    );
    res.json({ logisticsCosts: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:projectId/logistics
async function createLogisticsCost(req, res, next) {
  try {
    const { projectId } = req.params;
    const { costType, description, amount, costDate } = req.body;
    const { rows } = await db.query(
      `INSERT INTO logistics_costs (project_id, cost_type, description, amount, cost_date, recorded_by)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6) RETURNING *`,
      [projectId, costType, description, amount, costDate, req.user.id]
    );
    res.status(201).json({ logisticsCost: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listLogistics, createLogisticsCost };

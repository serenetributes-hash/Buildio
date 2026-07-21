const db = require('../config/db');

// GET /api/projects/:projectId/compliance
async function listCompliance(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM compliance_costs WHERE project_id = $1 ORDER BY issued_date DESC NULLS LAST`,
      [projectId]
    );
    res.json({ complianceCosts: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:projectId/compliance
async function createComplianceCost(req, res, next) {
  try {
    const { projectId } = req.params;
    const { complianceType, description, amount, issuedDate, expiryDate } = req.body;
    const { rows } = await db.query(
      `INSERT INTO compliance_costs (project_id, compliance_type, description, amount, issued_date, expiry_date, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [projectId, complianceType, description, amount, issuedDate, expiryDate, req.user.id]
    );
    res.status(201).json({ complianceCost: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCompliance, createComplianceCost };

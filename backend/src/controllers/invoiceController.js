const db = require('../config/db');

// GET /api/projects/:projectId/invoices
async function listInvoices(req, res, next) {
  try {
    const { projectId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM client_invoices WHERE project_id = $1 ORDER BY issued_date DESC`,
      [projectId]
    );
    res.json({ invoices: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects/:projectId/invoices
async function createInvoice(req, res, next) {
  try {
    const { projectId } = req.params;
    const { invoiceNumber, amount, taxRatePct, issuedDate, dueDate } = req.body;
    const { rows } = await db.query(
      `INSERT INTO client_invoices (project_id, invoice_number, amount, tax_rate_pct, issued_date, due_date, created_by)
       VALUES ($1,$2,$3,COALESCE($4,0),COALESCE($5, CURRENT_DATE),$6,$7) RETURNING *`,
      [projectId, invoiceNumber, amount, taxRatePct, issuedDate, dueDate, req.user.id]
    );
    res.status(201).json({ invoice: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listInvoices, createInvoice };

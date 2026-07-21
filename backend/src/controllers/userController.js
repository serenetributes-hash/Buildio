const db = require('../config/db');

// GET /api/users — admin only, for the "manage users" screen
async function listUsers(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, r.name AS role_name, u.created_at
       FROM users u JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers };

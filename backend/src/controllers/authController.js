const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, roleName: user.role_name, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = issueToken(user);
    res.json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, roleName: user.role_name },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/register  (Admin/Director only — see authRoutes.js)
// Used by the Main Admin to create Accountant / Receptionist / Client logins.
async function register(req, res, next) {
  try {
    const { fullName, email, password, roleName, clientProjectId } = req.body;
    if (!fullName || !email || !password || !roleName) {
      return res.status(400).json({ error: 'fullName, email, password, roleName are required' });
    }

    const roleRes = await db.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ error: `Unknown role: ${roleName}` });
    }
    const roleId = roleRes.rows[0].id;

    const existing = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, full_name, email`,
      [fullName, email.toLowerCase().trim(), passwordHash, roleId]
    );
    const newUser = rows[0];

    // If creating a client login, link it to the project they should see
    if (roleName === 'client' && clientProjectId) {
      await db.query(`UPDATE projects SET client_user_id = $1 WHERE id = $2`, [newUser.id, clientProjectId]);
    }

    res.status(201).json({ user: { ...newUser, roleName } });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, register, me };

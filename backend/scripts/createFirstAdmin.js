/**
 * scripts/createFirstAdmin.js
 *
 * The /api/auth/register endpoint requires an existing admin_director
 * to be logged in (chicken-and-egg on a fresh database). Run this
 * script once, directly against the database, to create the very
 * first Main Admin / Director login. After that, use the app itself
 * (or the API) to create Accountant / Receptionist / Client users.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/createFirstAdmin.js "Jane Doe" jane@company.com "StrongPassword123!"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const [fullName, email, password] = process.argv.slice(2);
  if (!fullName || !email || !password) {
    console.error('Usage: node scripts/createFirstAdmin.js "<Full Name>" <email> <password>');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = 'admin_director'`);
    if (roleRes.rows.length === 0) {
      throw new Error("roles table has no 'admin_director' row — did you run database/schema.sql?");
    }
    const roleId = roleRes.rows[0].id;

    const existing = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      throw new Error(`A user with email ${email} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1,$2,$3,$4) RETURNING id, full_name, email`,
      [fullName, email.toLowerCase().trim(), passwordHash, roleId]
    );

    console.log('Admin account created:', rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

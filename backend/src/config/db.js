/**
 * config/db.js — PostgreSQL connection pool (pg)
 * On Render, set DATABASE_URL to the Internal Database URL of your
 * Render Postgres instance (or external URL for local dev against a
 * remote DB). SSL is required by Render's managed Postgres.
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};

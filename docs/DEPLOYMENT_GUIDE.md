# Deployment Guide

Stack: React (Vercel) ↔ Node/Express (Render) ↔ PostgreSQL (Render).

## 1. Database — Render PostgreSQL

1. Render dashboard → **New +** → **PostgreSQL**. Pick a region close to
   your Render web service (same region avoids cross-region latency).
2. Once provisioned, copy the **Internal Database URL** (for the web
   service, same-region traffic, no egress cost) and the **External
   Database URL** (for running migrations from your local machine).
3. Run the schema against it from your local machine:
   ```bash
   psql "<EXTERNAL_DATABASE_URL>" -f database/schema.sql
   ```
   Or, from the backend folder, add a small migration runner script and
   run `npm run migrate` (see `scripts/runMigration.js` stub below).
4. Seed at least one `admin_director` user (hash a password with
   bcrypt first — do this via a one-off Node script, not directly in
   SQL, so the hash format matches what `auth` login logic expects).

```js
// scripts/runMigration.js (stub)
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sql = fs.readFileSync('../database/schema.sql', 'utf8');
pool.query(sql).then(() => { console.log('Migration applied'); pool.end(); })
  .catch((e) => { console.error(e); process.exit(1); });
```

## 2. Backend — Render Web Service

1. Push the `backend/` folder to a GitHub repo (or a `backend/`
   subdirectory of a monorepo — Render supports a "Root Directory"
   setting for this).
2. Render dashboard → **New +** → **Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend` (if monorepo)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Instance type:** Starter is fine to begin; scale later.
4. Add environment variables (Render → your service → **Environment**):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL from step 1 |
   | `JWT_SECRET` | long random string (e.g. `openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `FRONTEND_ORIGIN` | `https://your-app.vercel.app` (add after step 3) |
   | `NODE_ENV` | `production` |
   | `DB_SSL` | `true` |
5. Deploy. Render auto-redeploys on every push to the connected branch.
6. Confirm health check: `curl https://your-backend.onrender.com/health`.

## 3. Frontend — Vercel

1. Push `frontend/` to GitHub (same repo, different root directory, or
   a separate repo — either works).
2. Vercel dashboard → **Add New Project** → import the repo.
3. Settings:
   - **Root Directory:** `frontend` (if monorepo)
   - **Framework Preset:** Vite (or Create React App, matching your
     scaffold)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist` (Vite) or `build` (CRA)
4. Environment variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com/api` |
5. Deploy. Copy the resulting `https://your-app.vercel.app` URL.
6. Go back to Render → update `FRONTEND_ORIGIN` to that URL → this
   triggers a redeploy of the backend so CORS picks it up.

## 4. CORS between Vercel and Render — troubleshooting

The backend's `app.js` already handles this via a dynamic origin
check (see `backend/src/app.js`), which:
- Allows exact matches from the comma-separated `FRONTEND_ORIGIN` env var.
- Allows any `*.vercel.app` subdomain automatically, so PR preview
  deployments work without manually adding each preview URL.
- Allows requests with no `Origin` header (server-to-server, curl,
  Postman) — safe because those aren't subject to browser CORS anyway.

Common pitfalls:
- **Forgetting the protocol** in `FRONTEND_ORIGIN` (`your-app.vercel.app`
  instead of `https://your-app.vercel.app`) — the exact-match check
  will fail.
- **Trailing slash** in the env var — strip it; origins never have a
  trailing slash.
- If you introduce cookies/session auth instead of bearer-token JWTs,
  you'll also need `credentials: true` on the frontend fetch/axios
  config to match the backend's `credentials: true` CORS setting
  (already set).

## 5. Database migrations going forward

For a project this size, a lightweight migration tool beats hand-run
SQL once you have a live database with real data:
- **node-pg-migrate** (recommended, minimal, plain SQL/JS migrations)
  or **Prisma Migrate** if you'd rather generate the schema from a
  Prisma schema file instead of hand-written DDL.
- Store each migration as a numbered file in `backend/migrations/`,
  run `npm run migrate` as part of your deploy pipeline (Render
  supports a **Pre-Deploy Command** you can set to
  `npm run migrate && npm start`-style build hooks — set the
  Pre-Deploy Command to the migration step specifically).

## 6. Post-deploy checklist

- [ ] `/health` returns 200 on the Render URL
- [ ] Login flow issues a JWT and the frontend stores it (memory or
      httpOnly cookie — avoid `localStorage` for anything sensitive if
      you can use a cookie-based flow instead)
- [ ] A `client`-role login cannot fetch `/api/inventory` (should 403)
- [ ] A `receptionist`-role login cannot fetch `/api/finance/pl`
      (should 403)
- [ ] Stock-out with quantity exceeding `quantity_on_hand` returns 400,
      not a silent negative stock value
- [ ] `FRONTEND_ORIGIN` updated after every new Vercel production
      domain change (e.g. custom domain added later)

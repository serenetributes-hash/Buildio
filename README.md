# Construction Project Management + Mini-ERP

## What's in this package

```
construction-erp/
├── database/
│   └── schema.sql                 # Full PostgreSQL DDL (10 tables, 2 views)
├── backend/
│   ├── src/
│   │   ├── config/db.js           # pg Pool connection
│   │   ├── middleware/auth.js     # JWT verification
│   │   ├── middleware/rbac.js     # requireRole(), client-scoping, field scrubbing
│   │   ├── services/
│   │   │   ├── calculateProjectMetrics.js   # TBC, AS, RSI, Probability formulas
│   │   │   ├── allocateStockToProject.js    # Stock-out (+ stock-in) transactional logic
│   │   │   └── generateCompanyPL.js         # Company-wide Gross/Net Profit
│   │   ├── controllers/           # projectController, inventoryController, financeController
│   │   ├── routes/                # RBAC-wired Express routers
│   │   ├── app.js                 # Express app, CORS, error handling
│   │   └── server.js              # Entry point
│   ├── package.json
│   └── .env.example
├── frontend-docs/
│   └── FRONTEND_ARCHITECTURE.md   # React component breakdown + role-gating pattern
└── docs/
    └── DEPLOYMENT_GUIDE.md        # Vercel + Render + Postgres, step by step
```

## The math, implemented exactly as specified

| Metric | Formula | Where |
|---|---|---|
| Total Budgeted Cost (TBC) | TPV × 50% (configurable per project) | `v_project_metrics` view |
| Actual Spend (AS) | materials + labor + logistics + compliance | `v_project_actual_spend` view |
| Financial Progress % | (AS / TBC) × 100 | `calculateProjectMetrics.js` |
| Time Progress % | (Days Elapsed / Total Duration) × 100 | `calculateProjectMetrics.js` |
| Time Left | End Date − Today | `v_project_metrics` view |
| Material Utilization % | (Qty Used / Qty Estimated Needed) × 100 | `calculateProjectMetrics.js` |
| Resource Sufficiency Index (RSI) | (Remaining Budget / TBC) / (Time Left / Total Duration) | `calculateProjectMetrics.js` |
| Probability of On-Time Completion % | 0.6 × RSI-score + 0.4 × task-completion-vs-time score | `calculateProjectMetrics.js` |

Notes on judgment calls I made where the spec left room:
- **TBC is derived, not stored** — computed live from `total_project_value × budget_allocation_pct`
  in a view, so it never drifts if either input changes later.
- **RSI edge cases**: if a project is past its end date but still has
  budget left, RSI is treated as maximally healthy for the (zero) time
  remaining rather than dividing by zero. If no budget and no time
  remain, RSI = 0.
- **Probability fallback heuristic**: if a project has no `project_tasks`
  milestones defined, physical completion is assumed to track time
  elapsed 1:1 (a neutral assumption), which effectively makes the
  probability score lean on RSI. The API flags this in the response
  (`usedFallbackTaskHeuristic: true`) so the frontend can show a caveat.
- **Stock-out is transactional** — inventory decrement + allocation
  insert + audit log all happen in a single DB transaction with a row
  lock (`FOR UPDATE`) on the inventory item, so concurrent allocations
  can't push stock negative.

## RBAC summary

| Role | Projects | Operations (materials/labor/logistics/compliance) | Central Inventory | Finance / P&L |
|---|---|---|---|---|
| admin_director | Full | Full | Full | Full |
| accountant | View/edit | Full | Full | Full |
| receptionist | View timelines only | Office expenses only | None | None (403) |
| client | Own project, scrubbed metrics only | None | None | None |

Enforced twice: route-level (`requireRole` middleware, `403` on
violation) and payload-level (`scrubMetricsForClient` strips supplier
costs / RSI / actual spend before the response ever reaches a client
login) — so a client can't see privileged data even by inspecting raw
API responses.

## Running it locally end-to-end

1. **Database**: run `database/schema.sql` against a fresh Postgres instance.
2. **Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
   node scripts/createFirstAdmin.js "Your Name" you@company.com "StrongPassword123!"
   npm run dev             # http://localhost:4000
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
   npm run dev             # http://localhost:5173
   ```
4. Log in with the admin account you created in step 2. From there,
   click **"Load sample data"** on the Dashboard to populate inventory,
   workers, and a demo project — or click **"+ New Project"** to start
   from scratch. Use the **Users** page to create Accountant,
   Receptionist, and Client logins.
5. Follow `docs/DEPLOYMENT_GUIDE.md` to ship to Render + Vercel.

Both the frontend build and the full backend API were tested against
a live Postgres instance before this package was delivered — every
endpoint (auth, projects, inventory stock in/out, labor, logistics,
compliance, invoices, finance, users, sample-data seed) was hit with
real HTTP requests, not just reviewed as code.

## What's built vs. what's still a stub

**Everything is built and working end-to-end**, tested against a real
Postgres instance and real HTTP requests before packaging (not just
reviewed) — including a bug I caught and fixed this pass (a wrong
column name in the P&L compliance-cost query):

- Auth: login, JWT, admin bootstrap script, in-app "Create Login" form
  for Accountant/Receptionist/Client users (no more hand-crafted API calls).
- Dashboard: project list + **Create Project** form + one-click
  **Load Sample Data** (admin-only) that seeds realistic inventory,
  workers, and a demo project with real activity — so the app isn't
  empty on first login.
- Project Detail: Overview (metrics/gauges) plus tabbed **Labor**,
  **Logistics**, **Compliance**, and **Invoices** trackers — each with
  its own entry form and live table (Module B, fully implemented).
- Inventory: central warehouse table + **Stock In** and **Stock Out**
  forms, with low-stock banner (Module C, fully implemented).
- Finance: P&L report + **Log Overhead Expense** form (Module D).
- Users: admin panel listing all logins + Create Login form.
- Full RBAC enforced both in routing and in the API response payloads
  (client role never receives supplier costs, RSI, etc. — verified,
  not just coded).

**Reasonable next steps, not requested yet:**
- Task milestone management UI (project_tasks table exists and the
  Probability-of-On-Time-Completion formula already uses it when
  present — there's just no form to add milestones yet).
- Editing/deleting existing records (everything currently supports
  create + list, not update/delete).
- Pagination on tables (fine at demo scale, would matter at real volume).

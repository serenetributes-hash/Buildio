# React Frontend Architecture

## Folder structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.js              # axios instance, base URL from VITE_API_URL, attaches JWT
│   │   ├── projects.js            # getProjects(), getProjectMetrics(id), createProject()
│   │   ├── inventory.js           # getInventory(), stockIn(), stockOut()
│   │   └── finance.js             # getPL(), addOverhead()
│   ├── auth/
│   │   ├── AuthContext.jsx        # holds { user, token }, decodes JWT roleName
│   │   ├── useAuth.js
│   │   └── ProtectedRoute.jsx     # redirects to /login if unauthenticated
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx       # sidebar + topbar, renders nav items by role
│   │   │   ├── Sidebar.jsx
│   │   │   └── RoleGate.jsx       # <RoleGate allow={['admin_director','accountant']}>...</RoleGate>
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── ProjectList.jsx
│   │   │   └── ProjectFilters.jsx
│   │   ├── project-detail/
│   │   │   ├── MetricsHeader.jsx      # TPV, TBC, AS, time left
│   │   │   ├── ProgressBars.jsx       # Financial % / Time % side by side
│   │   │   ├── RSIGauge.jsx           # Resource Sufficiency Index gauge
│   │   │   ├── ProbabilityBadge.jsx   # Probability of On-Time Completion
│   │   │   ├── MaterialUtilizationChart.jsx
│   │   │   └── TaskMilestoneList.jsx
│   │   ├── operations/
│   │   │   ├── MaterialsTrackerForm.jsx
│   │   │   ├── LaborLogForm.jsx
│   │   │   ├── LogisticsForm.jsx
│   │   │   └── ComplianceForm.jsx
│   │   ├── inventory/
│   │   │   ├── CentralInventoryTable.jsx
│   │   │   ├── LowStockBanner.jsx
│   │   │   ├── StockInForm.jsx
│   │   │   └── StockOutForm.jsx       # dropdown: project + item, qty, waste %
│   │   ├── erp/
│   │   │   ├── PLStatement.jsx
│   │   │   ├── OverheadsForm.jsx
│   │   │   └── TaxEstimator.jsx
│   │   └── common/
│   │       ├── DataTable.jsx
│   │       ├── StatCard.jsx
│   │       └── Modal.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx          # Module A
│   │   ├── ProjectDetailPage.jsx      # Module A + B combined view
│   │   ├── InventoryPage.jsx          # Module C
│   │   ├── FinancePage.jsx            # Module D
│   │   └── ClientPortalPage.jsx       # separate, scrubbed layout for role=client
│   ├── App.jsx                        # route table
│   └── main.jsx
├── .env.example
└── package.json
```

## Role-based UI restriction pattern

Two layers, mirroring the backend:

1. **Route-level gating** — `ProtectedRoute` + role check redirects users
   away from pages they shouldn't reach at all (e.g. `receptionist`
   hitting `/finance`).
2. **Component-level gating** — `RoleGate` wraps individual UI elements
   (buttons, table columns, stat cards) so a page can render a partial
   view instead of an all-or-nothing block.

```jsx
// components/layout/RoleGate.jsx
export function RoleGate({ allow, children, fallback = null }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.roleName)) return fallback;
  return children;
}
```

```jsx
// Usage inside ProjectDetailPage.jsx
<RoleGate allow={['admin_director', 'accountant']}>
  <StatCard label="Actual Spend" value={metrics.inputs.actualSpend} />
  <RSIGauge value={metrics.metrics.resourceSufficiencyIndex} />
</RoleGate>

<RoleGate allow={['client']}>
  {/* Client sees only the scrubbed payload shape returned by the API */}
  <ProgressBars timePct={metrics.metrics.timeProgressPct} />
  <MaterialUtilizationChart pct={metrics.metrics.materialUtilizationPct} />
</RoleGate>
```

**Critical rule:** UI gating is UX polish only — never the security
boundary. The backend already scrubs the response payload per role
(`scrubMetricsForClient`, route-level `requireRole`), so even if a
client bypasses the UI, the API itself won't return supplier costs,
global inventory, or other clients' data.

## Navigation by role

| Role | Sidebar items |
|---|---|
| admin_director | Dashboard, Project Detail, Operations, Inventory, Finance (P&L), Users/Settings |
| accountant | Dashboard, Project Detail, Operations, Inventory (full), Finance (P&L) |
| receptionist | Dashboard (timelines only), Office Expenses form |
| client | Client Portal only (single project, scrubbed metrics) |

## State management

- `AuthContext` (React Context) for the current user + JWT — small
  enough not to need Redux/Zustand.
- Server data fetched with a lightweight data-fetching layer
  (`@tanstack/react-query` recommended) so metrics auto-refresh and
  cache invalidate after stock-in/stock-out or labor-log mutations.

## Key UX detail: RSI + Probability display

- `RSIGauge`: render as a semicircular gauge, 0–1+ scale, color bands
  (red < 0.7, amber 0.7–1.0, green > 1.0).
- `ProbabilityBadge`: single percentage with a tooltip breaking down
  the 60/40 weighting (RSI-derived score vs. task-completion score) and
  a small note when the backend flags `usedFallbackTaskHeuristic: true`
  (no milestones defined yet), so users understand the number is an
  estimate.

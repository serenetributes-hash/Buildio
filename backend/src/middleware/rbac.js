/**
 * middleware/rbac.js
 *
 * Two layers of enforcement, matching the spec:
 *  1. Route-level: requireRole(...) blocks entire endpoints to certain roles.
 *  2. Field-level: scrubForClient() strips sensitive fields before a
 *     response reaches a 'client' role user (defense in depth — never
 *     rely on the frontend alone to hide fields).
 *
 * Role names must match roles.name seed values:
 *   admin_director | accountant | receptionist | client
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
    }
    next();
  };
}

/**
 * Client role may only ever touch their own project(s). Use as route
 * middleware on any /projects/:projectId/* route.
 */
async function enforceClientProjectScope(req, res, next) {
  if (req.user.roleName !== 'client') return next();

  const db = require('../config/db');
  const { projectId } = req.params;
  const { rows } = await db.query(
    `SELECT 1 FROM projects WHERE id = $1 AND client_user_id = $2`,
    [projectId, req.user.id]
  );
  if (rows.length === 0) {
    return res.status(403).json({ error: 'Forbidden: not your project' });
  }
  next();
}

/**
 * Strips fields a client must never see from a project-metrics payload:
 * supplier costs, global inventory levels, company overheads, other
 * clients' data. Client only gets high-level progress metrics.
 */
function scrubMetricsForClient(metricsPayload) {
  return {
    projectId: metricsPayload.projectId,
    metrics: {
      timeProgressPct: metricsPayload.metrics.timeProgressPct,
      timeLeftDays: metricsPayload.metrics.timeLeftDays,
      materialUtilizationPct: metricsPayload.metrics.materialUtilizationPct,
      probabilityOnTimeCompletionPct: metricsPayload.metrics.probabilityOnTimeCompletionPct,
      // Deliberately omitted: financialProgressPct, resourceSufficiencyIndex,
      // actualSpend, totalBudgetedCost, remainingBudget — these expose
      // supplier costs / margins.
    },
  };
}

/**
 * Receptionist role: can view project timelines but not wages or P&L.
 * Use to scrub labor cost fields from a project detail payload.
 */
function scrubForReceptionist(projectPayload) {
  const { laborCost, wages, ...rest } = projectPayload;
  return rest;
}

module.exports = {
  requireRole,
  enforceClientProjectScope,
  scrubMetricsForClient,
  scrubForReceptionist,
};

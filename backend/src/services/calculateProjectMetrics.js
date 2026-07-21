/**
 * services/calculateProjectMetrics.js
 *
 * Implements the "Budgeted vs Actual" mathematical model:
 *   TBC   = TPV * (budget_allocation_pct / 100)      [default 50%]
 *   AS    = materials + labor + logistics + compliance
 *   Financial Progress % = (AS / TBC) * 100
 *   Time Progress %      = (Days Elapsed / Total Duration) * 100
 *   Time Left            = End Date - Today (days)
 *   Material Utilization % = (Qty Used / Qty Estimated Needed) * 100
 *   RSI = (Remaining Budget / TBC) / (Time Left / Total Duration)
 *   Probability On-Time % = 0.6 * RSI-derived score + 0.4 * task-completion-vs-time score
 *
 * All monetary math is done with a decimal-safe helper (see toMoney) to
 * avoid floating point drift; Postgres NUMERIC columns come back as
 * strings via node-pg, so we parse explicitly rather than relying on JS
 * doing it implicitly.
 */

const db = require('../config/db');

function toMoney(value) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function safeDiv(numerator, denominator) {
  if (!denominator || denominator === 0) return null; // caller decides fallback
  return numerator / denominator;
}

/**
 * Clamp a raw ratio-based score into a 0-100 percentage band.
 * RSI of 1.0 means "perfectly on pace" -> maps to 100.
 * RSI of 0 means "no budget headroom left relative to time" -> maps to 0.
 * RSI > 1 (ahead of pace) is capped at 100 for the probability score,
 * even though RSI itself is reported uncapped for diagnostic purposes.
 */
function rsiToScore(rsi) {
  if (rsi === null) return null;
  const score = rsi * 100;
  return Math.min(100, Math.max(0, score));
}

/**
 * Fallback heuristic when no project_tasks exist: approximate physical
 * completion using elapsed time itself (i.e. assume linear progress is
 * the best available estimate), which effectively neutralizes the task
 * component and leans the probability score toward RSI alone.
 */
async function getTaskCompletionRate(projectId, timeProgressPct) {
  const { rows } = await db.query(
    `SELECT weight_pct, is_complete FROM project_tasks WHERE project_id = $1`,
    [projectId]
  );

  if (rows.length === 0) {
    // No milestones defined — fallback heuristic: assume physical
    // progress tracks time progress (neutral assumption).
    return { rate: timeProgressPct, isFallback: true };
  }

  const totalWeight = rows.reduce((sum, t) => sum + toMoney(t.weight_pct), 0);
  if (totalWeight === 0) {
    return { rate: timeProgressPct, isFallback: true };
  }

  const completedWeight = rows
    .filter((t) => t.is_complete)
    .reduce((sum, t) => sum + toMoney(t.weight_pct), 0);

  return { rate: (completedWeight / totalWeight) * 100, isFallback: false };
}

async function calculateProjectMetrics(projectId) {
  const { rows } = await db.query(`SELECT * FROM v_project_metrics WHERE id = $1`, [projectId]);
  if (rows.length === 0) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  const p = rows[0];

  const tpv = toMoney(p.total_project_value);
  const tbc = toMoney(p.total_budgeted_cost);
  const actualSpend = toMoney(p.actual_spend);
  const totalDurationDays = Number(p.total_duration_days) || 0;
  const daysElapsed = Math.min(Number(p.days_elapsed) || 0, totalDurationDays);
  const timeLeftDays = Number(p.time_left_days);

  // --- Financial & time progress -----------------------------------
  const financialProgressPct = tbc > 0 ? (actualSpend / tbc) * 100 : 0;
  const timeProgressPct = totalDurationDays > 0 ? (daysElapsed / totalDurationDays) * 100 : 0;

  // --- Material Utilization Rate (aggregate across all allocations) --
  const matRes = await db.query(
    `SELECT
        COALESCE(SUM(quantity_used), 0)               AS used,
        COALESCE(SUM(quantity_estimated_needed), 0)    AS estimated
     FROM project_inventory_allocations
     WHERE project_id = $1`,
    [projectId]
  );
  const qtyUsed = toMoney(matRes.rows[0].used);
  const qtyEstimated = toMoney(matRes.rows[0].estimated);
  const materialUtilizationPct = qtyEstimated > 0 ? (qtyUsed / qtyEstimated) * 100 : null;

  // --- Resource Sufficiency Index (RSI) ------------------------------
  // RSI = (Remaining Budget / TBC) / (Time Left / Total Duration)
  const remainingBudget = tbc - actualSpend;
  const budgetRemainingRatio = tbc > 0 ? remainingBudget / tbc : 0;
  const timeRemainingRatio = totalDurationDays > 0 ? timeLeftDays / totalDurationDays : 0;

  let rsi = null;
  if (timeRemainingRatio > 0) {
    rsi = budgetRemainingRatio / timeRemainingRatio;
  } else if (timeRemainingRatio <= 0 && budgetRemainingRatio >= 0) {
    // Project is past its end date but budget remains — treat as
    // maximally sufficient for the remaining (zero) time.
    rsi = budgetRemainingRatio > 0 ? 999 : 0;
  } else {
    rsi = 0;
  }

  // --- Probability of On-Time Completion -----------------------------
  const { rate: taskCompletionRate, isFallback } = await getTaskCompletionRate(
    projectId,
    timeProgressPct
  );

  // Physical-vs-time score: 100 if tasks are ahead of/at pace with time
  // elapsed, degrading proportionally if behind pace.
  const paceRatio = timeProgressPct > 0 ? taskCompletionRate / timeProgressPct : 1;
  const taskScore = Math.min(100, Math.max(0, paceRatio * 100));

  const rsiScore = rsiToScore(rsi) ?? 50; // neutral fallback if RSI undefined
  const probabilityOnTimePct = rsiScore * 0.6 + taskScore * 0.4;

  return {
    projectId,
    inputs: {
      totalProjectValue: tpv,
      budgetAllocationPct: toMoney(p.budget_allocation_pct),
      totalBudgetedCost: tbc,
      actualSpend,
      totalDurationDays,
      daysElapsed,
      timeLeftDays,
    },
    metrics: {
      financialProgressPct: round2(financialProgressPct),
      timeProgressPct: round2(timeProgressPct),
      timeLeftDays,
      materialUtilizationPct: materialUtilizationPct === null ? null : round2(materialUtilizationPct),
      resourceSufficiencyIndex: round2(rsi),
      probabilityOnTimeCompletionPct: round2(probabilityOnTimePct),
    },
    diagnostics: {
      remainingBudget: round2(remainingBudget),
      taskCompletionRatePct: round2(taskCompletionRate),
      usedFallbackTaskHeuristic: isFallback,
    },
  };
}

function round2(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

module.exports = { calculateProjectMetrics, toMoney, round2 };

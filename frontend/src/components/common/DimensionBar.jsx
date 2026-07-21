function toneFor(pct, thresholds = { amber: 85, stop: 100 }) {
  if (pct >= thresholds.stop) return 'stop';
  if (pct >= thresholds.amber) return 'amber';
  return 'go';
}

/**
 * @param {string} label
 * @param {number} pct - 0-100+ (values over 100 are visually capped but the figure still shows real value)
 * @param {object} [thresholds] - pct at which the bar turns amber / stop
 */
export function DimensionBar({ label, pct, thresholds }) {
  const clamped = Math.min(100, Math.max(0, pct ?? 0));
  const tone = toneFor(pct ?? 0, thresholds);

  return (
    <div className="dim-bar">
      <div className="dim-label">
        <span>{label}</span>
        <span className="figure">{pct === null || pct === undefined ? '—' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="dim-track">
        <div className={`dim-fill ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

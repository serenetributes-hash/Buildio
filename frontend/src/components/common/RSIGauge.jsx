/**
 * Renders RSI (typically ranges roughly 0 - 2, where 1.0 = on pace) as
 * a semicircular gauge, echoing a site pressure/fuel gauge. Needle
 * angle is clamped to the 0-2 display range; the raw value is still
 * shown as text underneath for values outside that range.
 */
export function RSIGauge({ value }) {
  const displayMax = 2;
  const clamped = value === null || value === undefined ? 0 : Math.min(displayMax, Math.max(0, value));
  const angle = -90 + (clamped / displayMax) * 180; // -90deg (left) to +90deg (right)

  const tone = value === null || value === undefined
    ? 'neutral'
    : value >= 1
    ? 'go'
    : value >= 0.7
    ? 'amber'
    : 'stop';

  const toneColor = { go: '#2f7d5a', amber: '#b8860b', stop: '#b23a2e', neutral: '#8b96a3' }[tone];

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path d="M 14 94 A 76 76 0 0 1 166 94" fill="none" stroke="#ddd7c9" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 14 94 A 76 76 0 0 1 166 94"
          fill="none"
          stroke={toneColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / displayMax) * 239} 239`}
        />
        <g transform={`rotate(${angle} 90 94)`}>
          <line x1="90" y1="94" x2="90" y2="28" stroke="#10233b" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="90" cy="94" r="5" fill="#10233b" />
      </svg>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: 20, fontWeight: 600, color: toneColor, marginTop: -8 }}>
        {value === null || value === undefined ? '—' : value.toFixed(2)}
      </div>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Resource Sufficiency Index
      </div>
    </div>
  );
}

export function StatCard({ label, value, tone = '' }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${tone}`}>{value}</div>
    </div>
  );
}

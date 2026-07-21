import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { getPL } from '../api/finance';
import { StatCard } from '../components/common/StatCard';
import { OverheadsForm } from '../components/erp/OverheadsForm';

function firstOfYear() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FinancePage() {
  const [startDate, setStartDate] = useState(firstOfYear());
  const [endDate, setEndDate] = useState(today());
  const [pl, setPl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOverheadForm, setShowOverheadForm] = useState(false);

  async function runReport(e) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await getPL(startDate, endDate);
      setPl(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate P&L');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Module D · Mini-ERP</div>
          <h1>Profit &amp; Loss</h1>
        </div>
        <button className="btn primary" onClick={() => setShowOverheadForm(true)}>+ Log Overhead Expense</button>
      </div>

      <form onSubmit={runReport} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 20 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="start">Start date</label>
          <input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="end">End date</label>
          <input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Running…' : 'Generate report'}
        </button>
      </form>

      {error && <div className="callout">{error}</div>}

      {pl && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Revenue" value={`$${pl.revenue.totalRevenue.toLocaleString()}`} />
            <StatCard label="Direct Project Inputs" value={`$${pl.directProjectInputs.total.toLocaleString()}`} />
            <StatCard
              label="Gross Profit"
              value={`$${pl.grossProfit.toLocaleString()}`}
              tone={pl.grossProfit >= 0 ? 'go' : 'stop'}
            />
            <StatCard
              label="Net Profit"
              value={`$${pl.netProfit.toLocaleString()}`}
              tone={pl.netProfit >= 0 ? 'go' : 'stop'}
            />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Breakdown</h3>
            <table className="data-table">
              <tbody>
                <tr><td className="text">Materials</td><td>${pl.directProjectInputs.materials.toLocaleString()}</td></tr>
                <tr><td className="text">Labor</td><td>${pl.directProjectInputs.labor.toLocaleString()}</td></tr>
                <tr><td className="text">Logistics</td><td>${pl.directProjectInputs.logistics.toLocaleString()}</td></tr>
                <tr><td className="text">Compliance</td><td>${pl.directProjectInputs.compliance.toLocaleString()}</td></tr>
                <tr><td className="text">Non-project overheads</td><td>${pl.nonProjectExpenses.total.toLocaleString()}</td></tr>
                <tr><td className="text">Taxes</td><td>${pl.taxes.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!pl && !loading && !error && (
        <p className="muted" style={{ fontSize: 13 }}>
          Click "Generate report" above to calculate Gross &amp; Net Profit for the selected date range.
          Revenue comes from client invoices (raised per-project, under a project's "Invoices" tab).
        </p>
      )}

      {showOverheadForm && (
        <OverheadsForm onClose={() => setShowOverheadForm(false)} onDone={() => { if (pl) runReport(); }} />
      )}
    </AppShell>
  );
}

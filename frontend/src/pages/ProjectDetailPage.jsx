import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RoleGate } from '../components/layout/RoleGate';
import { StatCard } from '../components/common/StatCard';
import { DimensionBar } from '../components/common/DimensionBar';
import { RSIGauge } from '../components/common/RSIGauge';
import { DataTable } from '../components/common/DataTable';
import { getProjectMetrics } from '../api/projects';
import { getLaborLogs } from '../api/labor';
import { getLogistics } from '../api/logistics';
import { getCompliance } from '../api/compliance';
import { getInvoices } from '../api/invoices';
import { getWorkers } from '../api/workers';
import { LaborLogForm } from '../components/operations/LaborLogForm';
import { LogisticsForm } from '../components/operations/LogisticsForm';
import { ComplianceForm } from '../components/operations/ComplianceForm';
import { InvoiceForm } from '../components/erp/InvoiceForm';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'labor', label: 'Labor' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'invoices', label: 'Invoices' },
];

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [labor, setLabor] = useState(null);
  const [logistics, setLogistics] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [workers, setWorkers] = useState([]);

  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [showComplianceForm, setShowComplianceForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  function loadMetrics() {
    getProjectMetrics(projectId)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load project metrics'));
  }

  useEffect(loadMetrics, [projectId]);

  useEffect(() => {
    if (tab === 'labor' && labor === null) {
      getLaborLogs(projectId).then(setLabor).catch(() => setLabor([]));
      getWorkers().then(setWorkers).catch(() => {});
    }
    if (tab === 'logistics' && logistics === null) {
      getLogistics(projectId).then(setLogistics).catch(() => setLogistics([]));
    }
    if (tab === 'compliance' && compliance === null) {
      getCompliance(projectId).then(setCompliance).catch(() => setCompliance([]));
    }
    if (tab === 'invoices' && invoices === null) {
      getInvoices(projectId).then(setInvoices).catch(() => setInvoices([]));
    }
  }, [tab, projectId, labor, logistics, compliance, invoices]);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Module A · Project Detail</div>
          <h1>Project Metrics</h1>
        </div>
      </div>

      {error && <div className="callout">{error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn ghost"
            style={{
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--signal)' : '2px solid transparent',
              borderRadius: 0,
              color: tab === t.key ? 'var(--ink)' : 'var(--steel)',
              fontWeight: tab === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {!data && !error && <div className="muted">Loading…</div>}
          {data && (
            <>
              <RoleGate allow={['admin_director', 'accountant']}>
                <div className="stat-grid">
                  <StatCard label="Total Project Value" value={`$${data.inputs.totalProjectValue.toLocaleString()}`} />
                  <StatCard label="Total Budgeted Cost" value={`$${data.inputs.totalBudgetedCost.toLocaleString()}`} />
                  <StatCard
                    label="Actual Spend"
                    value={`$${data.inputs.actualSpend.toLocaleString()}`}
                    tone={data.metrics.financialProgressPct > 100 ? 'stop' : ''}
                  />
                  <StatCard label="Time Left" value={`${data.inputs.timeLeftDays} days`} />
                </div>
              </RoleGate>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}>Progress</h3>

                  <RoleGate allow={['admin_director', 'accountant']}>
                    <DimensionBar label="Financial Progress" pct={data.metrics.financialProgressPct} />
                  </RoleGate>

                  <DimensionBar label="Time Progress" pct={data.metrics.timeProgressPct} />

                  {data.metrics.materialUtilizationPct !== null && (
                    <DimensionBar label="Material Utilization" pct={data.metrics.materialUtilizationPct} />
                  )}

                  <DimensionBar
                    label="Probability of On-Time Completion"
                    pct={data.metrics.probabilityOnTimeCompletionPct}
                    thresholds={{ amber: 101, stop: 102 }}
                  />

                  {data.diagnostics?.usedFallbackTaskHeuristic && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      No task milestones recorded yet — completion probability estimated from time elapsed alone.
                    </div>
                  )}
                </div>

                <RoleGate allow={['admin_director', 'accountant']}>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RSIGauge value={data.metrics.resourceSufficiencyIndex} />
                  </div>
                </RoleGate>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'labor' && (
        <RoleGate allow={['admin_director', 'accountant']} fallback={<div className="callout">Wages are restricted to Admin/Director and Accountant roles.</div>}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div className="eyebrow">Module B · Labor / Wages Tracker</div>
            <button className="btn primary" onClick={() => setShowLaborForm(true)}>+ Log Wages</button>
          </div>
          <div className="card">
            {labor === null ? (
              <div className="muted">Loading…</div>
            ) : (
              <DataTable
                emptyLabel="No labor logged yet."
                columns={[
                  { key: 'worker_name', header: 'Worker', text: true },
                  { key: 'work_date', header: 'Date', render: (r) => new Date(r.work_date).toLocaleDateString() },
                  { key: 'hours_worked', header: 'Hours' },
                  { key: 'wage_amount', header: 'Wage', render: (r) => `$${Number(r.wage_amount).toFixed(2)}` },
                  { key: 'payment_status', header: 'Status', render: (r) => <span className={`badge ${r.payment_status === 'paid' ? 'go' : 'amber'}`}>{r.payment_status}</span> },
                ]}
                rows={labor}
              />
            )}
          </div>
          {showLaborForm && (
            <LaborLogForm
              projectId={projectId}
              workers={workers}
              onClose={() => setShowLaborForm(false)}
              onDone={() => { setLabor(null); loadMetrics(); }}
            />
          )}
        </RoleGate>
      )}

      {tab === 'logistics' && (
        <>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div className="eyebrow">Module B · Logistics Tracker</div>
            <RoleGate allow={['admin_director', 'accountant']}>
              <button className="btn primary" onClick={() => setShowLogisticsForm(true)}>+ Log Cost</button>
            </RoleGate>
          </div>
          <div className="card">
            {logistics === null ? (
              <div className="muted">Loading…</div>
            ) : (
              <DataTable
                emptyLabel="No logistics costs logged yet."
                columns={[
                  { key: 'cost_type', header: 'Type', text: true },
                  { key: 'description', header: 'Description', text: true },
                  { key: 'cost_date', header: 'Date', render: (r) => new Date(r.cost_date).toLocaleDateString() },
                  { key: 'amount', header: 'Amount', render: (r) => `$${Number(r.amount).toFixed(2)}` },
                ]}
                rows={logistics}
              />
            )}
          </div>
          {showLogisticsForm && (
            <LogisticsForm projectId={projectId} onClose={() => setShowLogisticsForm(false)} onDone={() => { setLogistics(null); loadMetrics(); }} />
          )}
        </>
      )}

      {tab === 'compliance' && (
        <RoleGate allow={['admin_director', 'accountant']} fallback={<div className="callout">Compliance records are restricted to Admin/Director and Accountant roles.</div>}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div className="eyebrow">Module B · Compliance Tracker</div>
            <button className="btn primary" onClick={() => setShowComplianceForm(true)}>+ Log Cost</button>
          </div>
          <div className="card">
            {compliance === null ? (
              <div className="muted">Loading…</div>
            ) : (
              <DataTable
                emptyLabel="No compliance costs logged yet."
                columns={[
                  { key: 'compliance_type', header: 'Type', text: true },
                  { key: 'description', header: 'Description', text: true },
                  { key: 'issued_date', header: 'Issued', render: (r) => r.issued_date ? new Date(r.issued_date).toLocaleDateString() : '—' },
                  { key: 'expiry_date', header: 'Expires', render: (r) => r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—' },
                  { key: 'amount', header: 'Amount', render: (r) => `$${Number(r.amount).toFixed(2)}` },
                ]}
                rows={compliance}
              />
            )}
          </div>
          {showComplianceForm && (
            <ComplianceForm projectId={projectId} onClose={() => setShowComplianceForm(false)} onDone={() => { setCompliance(null); loadMetrics(); }} />
          )}
        </RoleGate>
      )}

      {tab === 'invoices' && (
        <RoleGate allow={['admin_director', 'accountant']} fallback={<div className="callout">Invoicing is restricted to Admin/Director and Accountant roles.</div>}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div className="eyebrow">Module D · Client Invoicing</div>
            <button className="btn primary" onClick={() => setShowInvoiceForm(true)}>+ New Invoice</button>
          </div>
          <div className="card">
            {invoices === null ? (
              <div className="muted">Loading…</div>
            ) : (
              <DataTable
                emptyLabel="No invoices raised yet."
                columns={[
                  { key: 'invoice_number', header: 'Invoice #', text: true },
                  { key: 'issued_date', header: 'Issued', render: (r) => new Date(r.issued_date).toLocaleDateString() },
                  { key: 'amount', header: 'Amount', render: (r) => `$${Number(r.amount).toLocaleString()}` },
                  { key: 'tax_amount', header: 'Tax', render: (r) => `$${Number(r.tax_amount).toLocaleString()}` },
                  { key: 'status', header: 'Status', render: (r) => <span className={`badge ${r.status === 'paid' ? 'go' : 'amber'}`}>{r.status.replace('_', ' ')}</span> },
                ]}
                rows={invoices}
              />
            )}
          </div>
          {showInvoiceForm && (
            <InvoiceForm projectId={projectId} onClose={() => setShowInvoiceForm(false)} onDone={() => setInvoices(null)} />
          )}
        </RoleGate>
      )}
    </AppShell>
  );
}

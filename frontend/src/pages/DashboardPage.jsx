import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { RoleGate } from '../components/layout/RoleGate';
import { getProjects } from '../api/projects';
import { seedSampleData } from '../api/admin';
import { DataTable } from '../components/common/DataTable';
import { CreateProjectForm } from '../components/dashboard/CreateProjectForm';

const STATUS_TONE = {
  active: 'go',
  on_hold: 'amber',
  cancelled: 'stop',
  completed: 'neutral',
  planning: 'neutral',
};

export function DashboardPage() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState(null);

  function load() {
    getProjects().then(setProjects).catch((err) => setError(err.response?.data?.error || 'Failed to load projects'));
  }

  useEffect(load, []);

  async function handleSeed() {
    setSeeding(true);
    setNotice(null);
    setError(null);
    try {
      await seedSampleData();
      setNotice('Sample data loaded — inventory, workers, and a demo project are now populated.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sample data');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Module A</div>
          <h1>Project Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <RoleGate allow={['admin_director']}>
            <button className="btn ghost" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Loading sample data…' : 'Load sample data'}
            </button>
            <button className="btn primary" onClick={() => setShowCreate(true)}>+ New Project</button>
          </RoleGate>
        </div>
      </div>

      {notice && <div className="callout" style={{ borderColor: 'var(--go)', background: 'var(--go-soft)', color: 'var(--go)' }}>{notice}</div>}
      {error && <div className="callout">{error}</div>}

      <div className="card">
        {!projects ? (
          <div className="muted">Loading…</div>
        ) : (
          <DataTable
            emptyLabel="No projects yet — use “New Project” or “Load sample data” above to get started."
            columns={[
              { key: 'name', header: 'Project', text: true, render: (r) => <Link to={`/projects/${r.id}`}>{r.name}</Link> },
              { key: 'location', header: 'Location', text: true },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <span className={`badge ${STATUS_TONE[r.status] || 'neutral'}`}>{r.status.replace('_', ' ')}</span>,
              },
              { key: 'start_date', header: 'Start', render: (r) => new Date(r.start_date).toLocaleDateString() },
              { key: 'end_date', header: 'End', render: (r) => new Date(r.end_date).toLocaleDateString() },
              {
                key: 'total_project_value',
                header: 'Value',
                render: (r) => `$${Number(r.total_project_value).toLocaleString()}`,
              },
            ]}
            rows={projects}
          />
        )}
      </div>

      {showCreate && (
        <CreateProjectForm
          onClose={() => setShowCreate(false)}
          onCreated={() => load()}
        />
      )}
    </AppShell>
  );
}

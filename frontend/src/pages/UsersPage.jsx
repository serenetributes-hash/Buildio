import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { DataTable } from '../components/common/DataTable';
import { getUsers } from '../api/users';
import { CreateUserForm } from '../components/erp/CreateUserForm';

const ROLE_LABELS = {
  admin_director: 'Main Admin',
  accountant: 'Accountant',
  receptionist: 'Receptionist',
  client: 'Client',
};

export function UsersPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    getUsers().then(setUsers).catch((err) => setError(err.response?.data?.error || 'Failed to load users'));
  }

  useEffect(load, []);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Users &amp; Logins</h1>
        </div>
        <button className="btn primary" onClick={() => setShowForm(true)}>+ Create Login</button>
      </div>

      {error && <div className="callout">{error}</div>}

      <div className="card">
        {!users ? (
          <div className="muted">Loading…</div>
        ) : (
          <DataTable
            emptyLabel="No users yet."
            columns={[
              { key: 'full_name', header: 'Name', text: true },
              { key: 'email', header: 'Email', text: true },
              { key: 'role_name', header: 'Role', render: (r) => <span className="badge neutral">{ROLE_LABELS[r.role_name] || r.role_name}</span> },
              { key: 'is_active', header: 'Status', render: (r) => <span className={`badge ${r.is_active ? 'go' : 'stop'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> },
              { key: 'created_at', header: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
            ]}
            rows={users}
          />
        )}
      </div>

      {showForm && <CreateUserForm onClose={() => setShowForm(false)} onDone={() => load()} />}
    </AppShell>
  );
}

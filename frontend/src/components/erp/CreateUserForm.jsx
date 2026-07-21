import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { createUser } from '../../api/users';
import { getProjects } from '../../api/projects';

export function CreateUserForm({ onClose, onDone }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', roleName: 'accountant', clientProjectId: '' });
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.roleName === 'client') {
      getProjects().then(setProjects).catch(() => {});
    }
  }, [form.roleName]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const user = await createUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        roleName: form.roleName,
        clientProjectId: form.roleName === 'client' ? form.clientProjectId : undefined,
      });
      onDone(user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create User Login" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full name</label>
          <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input required type="text" minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min. 8 characters" />
        </div>
        <div className="field">
          <label>Role</label>
          <select value={form.roleName} onChange={(e) => update('roleName', e.target.value)}>
            <option value="accountant">Accountant</option>
            <option value="receptionist">Receptionist / Admin</option>
            <option value="client">Client</option>
          </select>
        </div>

        {form.roleName === 'client' && (
          <div className="field">
            <label>Linked project</label>
            <select required value={form.clientProjectId} onChange={(e) => update('clientProjectId', e.target.value)}>
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Creating…' : 'Create Login'}
        </button>
      </form>
    </Modal>
  );
}

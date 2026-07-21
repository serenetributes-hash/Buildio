import { useState } from 'react';
import { Modal } from '../common/Modal';
import { createProject } from '../../api/projects';

export function CreateProjectForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', location: '', totalProjectValue: '', budgetAllocationPct: '50',
    startDate: '', endDate: '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        name: form.name,
        location: form.location,
        totalProjectValue: parseFloat(form.totalProjectValue),
        budgetAllocationPct: parseFloat(form.budgetAllocationPct),
        startDate: form.startDate,
        endDate: form.endDate,
      });
      onCreated(project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Project" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Project name</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="field">
          <label>Location</label>
          <input value={form.location} onChange={(e) => update('location', e.target.value)} />
        </div>
        <div className="field">
          <label>Total Project Value ($)</label>
          <input required type="number" min="0" step="0.01" value={form.totalProjectValue} onChange={(e) => update('totalProjectValue', e.target.value)} />
        </div>
        <div className="field">
          <label>Budget Allocation % (default 50%)</label>
          <input required type="number" min="1" max="100" step="0.1" value={form.budgetAllocationPct} onChange={(e) => update('budgetAllocationPct', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Start date</label>
            <input required type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </div>
          <div className="field">
            <label>End date</label>
            <input required type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </div>
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Creating…' : 'Create Project'}
        </button>
      </form>
    </Modal>
  );
}

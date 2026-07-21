import { useState } from 'react';
import { Modal } from '../common/Modal';
import { createLogisticsCost } from '../../api/logistics';

export function LogisticsForm({ projectId, onClose, onDone }) {
  const [form, setForm] = useState({ costType: 'transport', description: '', amount: '', costDate: new Date().toISOString().slice(0, 10) });
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
      const cost = await createLogisticsCost(projectId, {
        costType: form.costType,
        description: form.description,
        amount: parseFloat(form.amount),
        costDate: form.costDate,
      });
      onDone(cost);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log logistics cost');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Logistics Cost" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Type</label>
          <select value={form.costType} onChange={(e) => update('costType', e.target.value)}>
            <option value="transport">Transport</option>
            <option value="machinery_hire">Machinery hire</option>
            <option value="fuel">Fuel</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Amount ($)</label>
            <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.costDate} onChange={(e) => update('costDate', e.target.value)} />
          </div>
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Saving…' : 'Log Cost'}
        </button>
      </form>
    </Modal>
  );
}

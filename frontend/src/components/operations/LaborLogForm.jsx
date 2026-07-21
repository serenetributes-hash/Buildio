import { useState } from 'react';
import { Modal } from '../common/Modal';
import { createLaborLog } from '../../api/labor';

export function LaborLogForm({ projectId, workers, onClose, onDone }) {
  const [form, setForm] = useState({
    workerId: workers[0]?.id || '', workDate: new Date().toISOString().slice(0, 10),
    hoursWorked: '8', wageAmount: '', paymentStatus: 'paid',
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
      const log = await createLaborLog(projectId, {
        workerId: form.workerId,
        workDate: form.workDate,
        hoursWorked: parseFloat(form.hoursWorked),
        wageAmount: parseFloat(form.wageAmount),
        paymentStatus: form.paymentStatus,
      });
      onDone(log);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log wages');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Worker Wages" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Worker</label>
          <select value={form.workerId} onChange={(e) => update('workerId', e.target.value)} required>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.full_name} — {w.role_title}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Work date</label>
            <input required type="date" value={form.workDate} onChange={(e) => update('workDate', e.target.value)} />
          </div>
          <div className="field">
            <label>Hours worked</label>
            <input type="number" min="0" step="0.5" value={form.hoursWorked} onChange={(e) => update('hoursWorked', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Wage amount ($)</label>
            <input required type="number" min="0" step="0.01" value={form.wageAmount} onChange={(e) => update('wageAmount', e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.paymentStatus} onChange={(e) => update('paymentStatus', e.target.value)}>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Saving…' : 'Log Wages'}
        </button>
      </form>
    </Modal>
  );
}

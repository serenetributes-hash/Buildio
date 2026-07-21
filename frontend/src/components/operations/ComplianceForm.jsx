import { useState } from 'react';
import { Modal } from '../common/Modal';
import { createComplianceCost } from '../../api/compliance';

export function ComplianceForm({ projectId, onClose, onDone }) {
  const [form, setForm] = useState({
    complianceType: 'permit', description: '', amount: '',
    issuedDate: new Date().toISOString().slice(0, 10), expiryDate: '',
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
      const cost = await createComplianceCost(projectId, {
        complianceType: form.complianceType,
        description: form.description,
        amount: parseFloat(form.amount),
        issuedDate: form.issuedDate,
        expiryDate: form.expiryDate || null,
      });
      onDone(cost);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log compliance cost');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Compliance Cost" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Type</label>
          <select value={form.complianceType} onChange={(e) => update('complianceType', e.target.value)}>
            <option value="license">License</option>
            <option value="permit">Permit</option>
            <option value="insurance">Insurance</option>
            <option value="inspection">Inspection</option>
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
            <label>Issued date</label>
            <input type="date" value={form.issuedDate} onChange={(e) => update('issuedDate', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Expiry date (optional)</label>
          <input type="date" value={form.expiryDate} onChange={(e) => update('expiryDate', e.target.value)} />
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Saving…' : 'Log Cost'}
        </button>
      </form>
    </Modal>
  );
}

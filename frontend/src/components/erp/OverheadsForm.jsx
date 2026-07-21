import { useState } from 'react';
import { Modal } from '../common/Modal';
import { addOverhead } from '../../api/finance';

export function OverheadsForm({ onClose, onDone }) {
  const [form, setForm] = useState({ category: 'rent', description: '', amount: '', expenseDate: new Date().toISOString().slice(0, 10) });
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
      const overhead = await addOverhead({
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
      });
      onDone(overhead);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log Non-Project Expense" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)}>
            <option value="payroll">Head-office payroll</option>
            <option value="rent">Rent</option>
            <option value="utilities">Utilities</option>
            <option value="office_supplies">Office supplies</option>
            <option value="depreciation">Equipment depreciation</option>
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
            <input type="date" value={form.expenseDate} onChange={(e) => update('expenseDate', e.target.value)} />
          </div>
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Saving…' : 'Log Expense'}
        </button>
      </form>
    </Modal>
  );
}

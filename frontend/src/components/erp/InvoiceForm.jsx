import { useState } from 'react';
import { Modal } from '../common/Modal';
import { createInvoice } from '../../api/invoices';

export function InvoiceForm({ projectId, onClose, onDone }) {
  const [form, setForm] = useState({
    invoiceNumber: '', amount: '', taxRatePct: '0',
    issuedDate: new Date().toISOString().slice(0, 10), dueDate: '',
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
      const invoice = await createInvoice(projectId, {
        invoiceNumber: form.invoiceNumber,
        amount: parseFloat(form.amount),
        taxRatePct: parseFloat(form.taxRatePct || '0'),
        issuedDate: form.issuedDate,
        dueDate: form.dueDate || null,
      });
      onDone(invoice);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Client Invoice" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Invoice number</label>
          <input required value={form.invoiceNumber} onChange={(e) => update('invoiceNumber', e.target.value)} placeholder="INV-2026-001" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Amount ($)</label>
            <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} />
          </div>
          <div className="field">
            <label>Tax rate %</label>
            <input type="number" min="0" step="0.1" value={form.taxRatePct} onChange={(e) => update('taxRatePct', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Issued date</label>
            <input type="date" value={form.issuedDate} onChange={(e) => update('issuedDate', e.target.value)} />
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
          </div>
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Saving…' : 'Create Invoice'}
        </button>
      </form>
    </Modal>
  );
}

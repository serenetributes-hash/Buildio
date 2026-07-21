import { useState } from 'react';
import { Modal } from '../common/Modal';
import { stockIn } from '../../api/inventory';

export function StockInForm({ inventory, onClose, onDone }) {
  const [form, setForm] = useState({ inventoryItemId: inventory[0]?.id || '', supplierName: '', quantity: '', unitCost: '', invoiceReference: '' });
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
      await stockIn({
        inventoryItemId: form.inventoryItemId,
        supplierName: form.supplierName,
        quantity: parseFloat(form.quantity),
        unitCost: parseFloat(form.unitCost),
        invoiceReference: form.invoiceReference,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record stock intake');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Stock In — Purchase Intake" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Item</label>
          <select value={form.inventoryItemId} onChange={(e) => update('inventoryItemId', e.target.value)} required>
            {inventory.map((i) => (
              <option key={i.id} value={i.id}>{i.item_name} ({i.unit_of_measure})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Supplier</label>
          <input value={form.supplierName} onChange={(e) => update('supplierName', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Quantity</label>
            <input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
          </div>
          <div className="field">
            <label>Unit cost ($)</label>
            <input required type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => update('unitCost', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Invoice reference</label>
          <input value={form.invoiceReference} onChange={(e) => update('invoiceReference', e.target.value)} />
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Recording…' : 'Record Stock In'}
        </button>
      </form>
    </Modal>
  );
}

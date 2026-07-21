import { useState } from 'react';
import { Modal } from '../common/Modal';
import { stockOut } from '../../api/inventory';

export function StockOutForm({ inventory, projects, onClose, onDone }) {
  const [form, setForm] = useState({
    projectId: projects[0]?.id || '',
    inventoryItemId: inventory[0]?.id || '',
    quantity: '',
    wasteFactorPct: '0',
    quantityEstimatedNeeded: '',
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
      const result = await stockOut({
        projectId: form.projectId,
        inventoryItemId: form.inventoryItemId,
        quantity: parseFloat(form.quantity),
        wasteFactorPct: parseFloat(form.wasteFactorPct || '0'),
        quantityEstimatedNeeded: form.quantityEstimatedNeeded ? parseFloat(form.quantityEstimatedNeeded) : null,
      });
      onDone(result);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to allocate stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Stock Out — Allocate to Project" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Project</label>
          <select value={form.projectId} onChange={(e) => update('projectId', e.target.value)} required>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Item</label>
          <select value={form.inventoryItemId} onChange={(e) => update('inventoryItemId', e.target.value)} required>
            {inventory.map((i) => (
              <option key={i.id} value={i.id}>{i.item_name} — {Number(i.quantity_on_hand).toLocaleString()} {i.unit_of_measure} on hand</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Quantity</label>
            <input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
          </div>
          <div className="field">
            <label>Waste factor %</label>
            <input type="number" min="0" step="0.1" value={form.wasteFactorPct} onChange={(e) => update('wasteFactorPct', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Estimated quantity needed (optional — drives Material Utilization %)</label>
          <input type="number" min="0" step="0.001" value={form.quantityEstimatedNeeded} onChange={(e) => update('quantityEstimatedNeeded', e.target.value)} />
        </div>

        {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

        <button className="btn primary" type="submit" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          {saving ? 'Allocating…' : 'Allocate to Project'}
        </button>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { DataTable } from '../components/common/DataTable';
import { getInventory } from '../api/inventory';
import { getProjects } from '../api/projects';
import { StockInForm } from '../components/inventory/StockInForm';
import { StockOutForm } from '../components/inventory/StockOutForm';

export function InventoryPage() {
  const [inventory, setInventory] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);

  function load() {
    getInventory().then(setInventory).catch((err) => setError(err.response?.data?.error || 'Failed to load inventory'));
    getProjects().then(setProjects).catch(() => {});
  }

  useEffect(load, []);

  const lowStockItems = inventory?.filter((i) => i.is_low_stock) || [];

  function handleStockOutDone(result) {
    setNotice(
      result.lowStockAlert
        ? `Allocated. Heads up — "${result.itemName}" just dropped to/below its reorder threshold (${result.quantityRemaining} left).`
        : `Allocated ${result.itemName} to the project.`
    );
    load();
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Module C</div>
          <h1>Central Warehouse Inventory</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={() => setShowStockOut(true)} disabled={!inventory?.length || !projects.length}>
            Stock Out
          </button>
          <button className="btn primary" onClick={() => setShowStockIn(true)} disabled={!inventory?.length}>
            Stock In
          </button>
        </div>
      </div>

      {error && <div className="callout">{error}</div>}
      {notice && <div className="callout" style={{ borderColor: 'var(--go)', background: 'var(--go-soft)', color: 'var(--go)' }}>{notice}</div>}

      {lowStockItems.length > 0 && (
        <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>
          {lowStockItems.length} item(s) at or below reorder threshold: {lowStockItems.map((i) => i.item_name).join(', ')}
        </div>
      )}

      <div className="card">
        {!inventory ? (
          <div className="muted">Loading…</div>
        ) : (
          <DataTable
            emptyLabel="No inventory items yet — use “Stock In” above, or load sample data from the Dashboard."
            columns={[
              { key: 'item_name', header: 'Item', text: true },
              { key: 'category_name', header: 'Category', text: true },
              { key: 'quantity_on_hand', header: 'Qty on Hand', render: (r) => Number(r.quantity_on_hand).toLocaleString() },
              { key: 'unit_of_measure', header: 'Unit', text: true },
              { key: 'average_unit_cost', header: 'Avg Unit Cost', render: (r) => `$${Number(r.average_unit_cost).toFixed(2)}` },
              {
                key: 'is_low_stock',
                header: 'Status',
                render: (r) => (
                  <span className={`badge ${r.is_low_stock ? 'stop' : 'go'}`}>
                    {r.is_low_stock ? 'Reorder' : 'OK'}
                  </span>
                ),
              },
            ]}
            rows={inventory}
          />
        )}
      </div>

      {showStockIn && inventory?.length > 0 && (
        <StockInForm inventory={inventory} onClose={() => setShowStockIn(false)} onDone={() => { setNotice('Stock intake recorded.'); load(); }} />
      )}
      {showStockOut && inventory?.length > 0 && projects.length > 0 && (
        <StockOutForm inventory={inventory} projects={projects} onClose={() => setShowStockOut(false)} onDone={handleStockOutDone} />
      )}
    </AppShell>
  );
}

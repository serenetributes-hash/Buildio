const db = require('../config/db');

/**
 * POST /api/admin/seed-sample-data
 * Admin/Director only. Idempotent-ish: uses ON CONFLICT DO NOTHING /
 * checks so re-running it doesn't duplicate categories, but will add a
 * fresh demo project each time it's run (harmless — just delete extra
 * ones from the Dashboard once project deletion UI exists, or via SQL).
 */
async function seedSampleData(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // --- Material categories ---------------------------------------
    const categories = ['Cement', 'Sand', 'Ballast', 'Nails', 'Timber', 'Steel Bars'];
    const categoryIds = {};
    for (const name of categories) {
      const res1 = await client.query(
        `INSERT INTO material_categories (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name]
      );
      categoryIds[name] = res1.rows[0].id;
    }

    // --- Central inventory items with realistic starting stock ------
    const items = [
      { name: 'Portland Cement 50kg Bag', unit: 'bag', category: 'Cement', qty: 420, cost: 9.5, threshold: 100 },
      { name: 'River Sand', unit: 'ton', category: 'Sand', qty: 85, cost: 28, threshold: 20 },
      { name: 'Ballast (Aggregate)', unit: 'ton', category: 'Ballast', qty: 60, cost: 32, threshold: 15 },
      { name: '4-inch Nails', unit: 'kg', category: 'Nails', qty: 210, cost: 2.4, threshold: 50 },
      { name: 'Timber 2x4 Plank', unit: 'piece', category: 'Timber', qty: 340, cost: 6.75, threshold: 80 },
      { name: 'Steel Reinforcement Bar 12mm', unit: 'piece', category: 'Steel Bars', qty: 18, cost: 14.2, threshold: 25 }, // deliberately low, to demo the alert
    ];

    const inventoryIds = {};
    for (const item of items) {
      const existing = await client.query(
        `SELECT id FROM central_inventory WHERE item_name = $1 AND unit_of_measure = $2`,
        [item.name, item.unit]
      );
      if (existing.rows.length > 0) {
        inventoryIds[item.name] = existing.rows[0].id;
        continue;
      }
      const inv = await client.query(
        `INSERT INTO central_inventory
          (category_id, item_name, unit_of_measure, quantity_on_hand, average_unit_cost, reorder_threshold)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [categoryIds[item.category], item.name, item.unit, item.qty, item.cost, item.threshold]
      );
      inventoryIds[item.name] = inv.rows[0].id;

      await client.query(
        `INSERT INTO stock_in_transactions (inventory_item_id, supplier_name, quantity, unit_cost, invoice_reference, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [inv.rows[0].id, 'Demo Supplier Ltd', item.qty, item.cost, 'SEED-INV-001', req.user.id]
      );
    }

    // --- Workers ------------------------------------------------------
    const workers = [
      { name: 'Peter Odhiambo', role: 'Mason', rate: 25 },
      { name: 'James Mwangi', role: 'Electrician', rate: 35 },
      { name: 'Grace Nakato', role: 'Site Laborer', rate: 18 },
    ];
    const workerIds = [];
    for (const w of workers) {
      const existing = await client.query(`SELECT id FROM workers WHERE full_name = $1`, [w.name]);
      if (existing.rows.length > 0) {
        workerIds.push(existing.rows[0].id);
        continue;
      }
      const wr = await client.query(
        `INSERT INTO workers (full_name, role_title, daily_rate) VALUES ($1,$2,$3) RETURNING id`,
        [w.name, w.role, w.rate]
      );
      workerIds.push(wr.rows[0].id);
    }

    // --- Demo project with real activity so metrics aren't all zero --
    const proj = await client.query(
      `INSERT INTO projects (name, location, total_project_value, budget_allocation_pct, start_date, end_date, created_by)
       VALUES ($1,$2,$3,50,CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days',$4)
       RETURNING id`,
      ['Riverside Apartments — Demo Project', 'Nairobi, Kenya', 250000, req.user.id]
    );
    const projectId = proj.rows[0].id;

    // Allocate some materials to it (drives Actual Spend + Material Utilization)
    const cementId = inventoryIds['Portland Cement 50kg Bag'];
    const cementRow = await client.query(`SELECT average_unit_cost FROM central_inventory WHERE id = $1`, [cementId]);
    const cementCost = parseFloat(cementRow.rows[0].average_unit_cost);
    await client.query(
      `UPDATE central_inventory SET quantity_on_hand = quantity_on_hand - 120 WHERE id = $1`,
      [cementId]
    );
    await client.query(
      `INSERT INTO project_inventory_allocations
        (project_id, inventory_item_id, quantity_used, unit_cost_at_time, waste_factor_pct, quantity_estimated_needed, allocated_by)
       VALUES ($1,$2,120,$3,5,300,$4)`,
      [projectId, cementId, cementCost, req.user.id]
    );

    // Labor logs
    await client.query(
      `INSERT INTO labor_logs (project_id, worker_id, work_date, hours_worked, wage_amount, payment_status, recorded_by)
       VALUES
        ($1,$2,CURRENT_DATE - INTERVAL '5 days',8,25,'paid',$4),
        ($1,$3,CURRENT_DATE - INTERVAL '3 days',8,35,'paid',$4)`,
      [projectId, workerIds[0], workerIds[1], req.user.id]
    );

    // Logistics
    await client.query(
      `INSERT INTO logistics_costs (project_id, cost_type, description, amount, cost_date, recorded_by)
       VALUES ($1,'transport','Cement delivery truck hire',450,CURRENT_DATE - INTERVAL '4 days',$2)`,
      [projectId, req.user.id]
    );

    // Compliance
    await client.query(
      `INSERT INTO compliance_costs (project_id, compliance_type, description, amount, issued_date, recorded_by)
       VALUES ($1,'permit','County building permit',1200,CURRENT_DATE - INTERVAL '28 days',$2)`,
      [projectId, req.user.id]
    );

    // A client invoice (revenue, for P&L)
    await client.query(
      `INSERT INTO client_invoices (project_id, invoice_number, amount, tax_rate_pct, issued_date, created_by)
       VALUES ($1,'INV-DEMO-001',80000,16,CURRENT_DATE - INTERVAL '10 days',$2)`,
      [projectId, req.user.id]
    );

    // A company overhead expense (for Net Profit)
    await client.query(
      `INSERT INTO erp_overheads (category, description, amount, expense_date, recorded_by)
       VALUES ('rent','Head office rent — monthly',1500,CURRENT_DATE,$1)`,
      [req.user.id]
    );

    await client.query('COMMIT');
    res.json({
      status: 'sample data loaded',
      projectId,
      note: 'Categories/inventory/workers are safe to re-run without duplicating. A new demo project is created each run.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { seedSampleData };

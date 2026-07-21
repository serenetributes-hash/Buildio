/**
 * services/allocateStockToProject.js
 *
 * Handles the "Stock Out (Allocation)" workflow:
 *  - Decrements central_inventory.quantity_on_hand
 *  - Snapshots the current average_unit_cost onto the allocation row
 *    (so historic project spend isn't retroactively changed by future
 *    price changes)
 *  - Increases the project's Actual Spend (implicitly, since AS is
 *    derived live from project_inventory_allocations via the view)
 *  - Runs inside a DB transaction so inventory and allocation stay
 *    consistent even if something fails mid-way
 *  - Writes an audit_log entry
 *  - Returns whether the item has now dropped below its reorder
 *    threshold, so the caller (controller) can trigger a low-stock alert
 */

const db = require('../config/db');

class InsufficientStockError extends Error {
  constructor(available, requested) {
    super(`Insufficient stock: requested ${requested}, only ${available} available`);
    this.statusCode = 400;
    this.available = available;
    this.requested = requested;
  }
}

/**
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.inventoryItemId
 * @param {number} params.quantity
 * @param {number} [params.wasteFactorPct]
 * @param {number} [params.quantityEstimatedNeeded] - optional, for Material Utilization Rate
 * @param {string} params.allocatedBy - user id
 */
async function allocateStockToProject({
  projectId,
  inventoryItemId,
  quantity,
  wasteFactorPct = 0,
  quantityEstimatedNeeded = null,
  allocatedBy,
}) {
  if (!quantity || quantity <= 0) {
    const err = new Error('Quantity must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock the inventory row to prevent race conditions on concurrent
    // allocations depleting stock past zero.
    const invRes = await client.query(
      `SELECT id, quantity_on_hand, average_unit_cost, reorder_threshold, item_name
       FROM central_inventory
       WHERE id = $1
       FOR UPDATE`,
      [inventoryItemId]
    );

    if (invRes.rows.length === 0) {
      const err = new Error('Inventory item not found');
      err.statusCode = 404;
      throw err;
    }

    const item = invRes.rows[0];
    const available = parseFloat(item.quantity_on_hand);
    const effectiveQuantity = quantity * (1 + wasteFactorPct / 100);

    if (effectiveQuantity > available) {
      throw new InsufficientStockError(available, effectiveQuantity);
    }

    const unitCostSnapshot = parseFloat(item.average_unit_cost);

    // 1. Decrement central inventory
    const newQty = available - effectiveQuantity;
    await client.query(
      `UPDATE central_inventory
       SET quantity_on_hand = $1, updated_at = now()
       WHERE id = $2`,
      [newQty, inventoryItemId]
    );

    // 2. Insert the allocation record (this is what drives project Actual Spend)
    const allocRes = await client.query(
      `INSERT INTO project_inventory_allocations
        (project_id, inventory_item_id, quantity_used, unit_cost_at_time,
         waste_factor_pct, quantity_estimated_needed, allocated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projectId,
        inventoryItemId,
        effectiveQuantity,
        unitCostSnapshot,
        wasteFactorPct,
        quantityEstimatedNeeded,
        allocatedBy,
      ]
    );

    // 3. Audit log
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_table, entity_id, details)
       VALUES ($1, 'stock_out', 'project_inventory_allocations', $2, $3)`,
      [
        allocatedBy,
        allocRes.rows[0].id,
        JSON.stringify({ projectId, inventoryItemId, quantity: effectiveQuantity, unitCostSnapshot }),
      ]
    );

    await client.query('COMMIT');

    return {
      allocation: allocRes.rows[0],
      lowStockAlert: newQty <= parseFloat(item.reorder_threshold),
      itemName: item.item_name,
      quantityRemaining: newQty,
      reorderThreshold: parseFloat(item.reorder_threshold),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Stock IN workflow (companion function): records a purchase and updates
 * the weighted average unit cost of the inventory item.
 *   new_avg = ((old_qty * old_avg) + (new_qty * new_unit_cost)) / (old_qty + new_qty)
 */
async function stockInToCentralInventory({
  inventoryItemId,
  supplierName,
  quantity,
  unitCost,
  invoiceReference,
  recordedBy,
}) {
  if (!quantity || quantity <= 0) {
    const err = new Error('Quantity must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      `SELECT quantity_on_hand, average_unit_cost FROM central_inventory WHERE id = $1 FOR UPDATE`,
      [inventoryItemId]
    );
    if (invRes.rows.length === 0) {
      const err = new Error('Inventory item not found');
      err.statusCode = 404;
      throw err;
    }

    const oldQty = parseFloat(invRes.rows[0].quantity_on_hand);
    const oldAvg = parseFloat(invRes.rows[0].average_unit_cost);
    const newQty = oldQty + quantity;
    const newAvg = newQty > 0 ? (oldQty * oldAvg + quantity * unitCost) / newQty : unitCost;

    await client.query(
      `UPDATE central_inventory
       SET quantity_on_hand = $1, average_unit_cost = $2, updated_at = now()
       WHERE id = $3`,
      [newQty, newAvg, inventoryItemId]
    );

    const stockInRes = await client.query(
      `INSERT INTO stock_in_transactions
        (inventory_item_id, supplier_name, quantity, unit_cost, invoice_reference, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [inventoryItemId, supplierName, quantity, unitCost, invoiceReference, recordedBy]
    );

    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_table, entity_id, details)
       VALUES ($1, 'stock_in', 'stock_in_transactions', $2, $3)`,
      [recordedBy, stockInRes.rows[0].id, JSON.stringify({ inventoryItemId, quantity, unitCost, newAvg })]
    );

    await client.query('COMMIT');
    return { transaction: stockInRes.rows[0], newQuantityOnHand: newQty, newAverageUnitCost: newAvg };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { allocateStockToProject, stockInToCentralInventory, InsufficientStockError };

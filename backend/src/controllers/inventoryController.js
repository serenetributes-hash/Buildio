const db = require('../config/db');
const {
  allocateStockToProject,
  stockInToCentralInventory,
  InsufficientStockError,
} = require('../services/allocateStockToProject');

// GET /api/inventory — central warehouse listing, with low-stock flag
async function listInventory(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT ci.*, mc.name AS category_name,
              (ci.quantity_on_hand <= ci.reorder_threshold) AS is_low_stock
       FROM central_inventory ci
       JOIN material_categories mc ON mc.id = ci.category_id
       ORDER BY mc.name, ci.item_name`
    );
    res.json({ inventory: rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/stock-in  (Accountant / Admin only — enforced by route middleware)
async function stockIn(req, res, next) {
  try {
    const { inventoryItemId, supplierName, quantity, unitCost, invoiceReference } = req.body;
    const result = await stockInToCentralInventory({
      inventoryItemId,
      supplierName,
      quantity,
      unitCost,
      invoiceReference,
      recordedBy: req.user.id,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/stock-out  (allocate to project)
async function stockOut(req, res, next) {
  try {
    const { projectId, inventoryItemId, quantity, wasteFactorPct, quantityEstimatedNeeded } = req.body;
    const result = await allocateStockToProject({
      projectId,
      inventoryItemId,
      quantity,
      wasteFactorPct,
      quantityEstimatedNeeded,
      allocatedBy: req.user.id,
    });

    if (result.lowStockAlert) {
      // In production: push a notification (email/websocket) to
      // admin_director + accountant roles here.
      console.warn(`LOW STOCK ALERT: ${result.itemName} at ${result.quantityRemaining}`);
    }

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { listInventory, stockIn, stockOut };

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/inventoryController');

router.use(authenticate);

// Client and receptionist must never see global inventory levels
router.get('/', requireRole('admin_director', 'accountant'), ctrl.listInventory);

// Stock intake: Accountant + Admin/Director only
router.post('/stock-in', requireRole('admin_director', 'accountant'), ctrl.stockIn);

// Stock allocation to project: Accountant + Admin/Director only
router.post('/stock-out', requireRole('admin_director', 'accountant'), ctrl.stockOut);

module.exports = router;

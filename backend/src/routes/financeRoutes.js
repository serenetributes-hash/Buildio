const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/financeController');

router.use(authenticate);

// P&L: strictly Admin/Director + Accountant. Receptionist and Client blocked.
router.get('/pl', requireRole('admin_director', 'accountant'), ctrl.getPL);

// Overhead entry: Accountant (full ERP access) + Admin/Director.
// Receptionist can log OFFICE expenses only — see receptionistRoutes note in README.
router.post('/overheads', requireRole('admin_director', 'accountant'), ctrl.addOverhead);

module.exports = router;

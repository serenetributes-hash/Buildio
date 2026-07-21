const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/workerController');

router.use(authenticate);
router.get('/', requireRole('admin_director', 'accountant'), ctrl.listWorkers);
router.post('/', requireRole('admin_director', 'accountant'), ctrl.createWorker);

module.exports = router;

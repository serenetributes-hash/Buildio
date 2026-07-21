const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const seedCtrl = require('../controllers/seedController');

router.use(authenticate, requireRole('admin_director'));

router.post('/seed-sample-data', seedCtrl.seedSampleData);

module.exports = router;

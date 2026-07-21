const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const userCtrl = require('../controllers/userController');
const authCtrl = require('../controllers/authController');

router.use(authenticate, requireRole('admin_director'));

router.get('/', userCtrl.listUsers);
router.post('/', authCtrl.register); // same logic as /api/auth/register, exposed here too for a cleaner "Users" admin page

module.exports = router;

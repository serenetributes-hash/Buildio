const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);

// Only an existing Admin/Director can create new logins
router.post('/register', authenticate, requireRole('admin_director'), ctrl.register);

router.get('/me', authenticate, ctrl.me);

module.exports = router;

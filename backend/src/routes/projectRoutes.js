const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { requireRole, enforceClientProjectScope } = require('../middleware/rbac');
const ctrl = require('../controllers/projectController');

router.use(authenticate);

// All authenticated roles can list (client is auto-scoped in controller)
router.get('/', ctrl.listProjects);

// Client scoping enforced; all roles can view metrics (payload is scrubbed for client)
router.get('/:projectId/metrics', enforceClientProjectScope, ctrl.getProjectMetrics);

// Only Admin/Director can create projects
router.post('/', requireRole('admin_director'), ctrl.createProject);

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true }); // gives access to :projectId from the parent mount

const { authenticate } = require('../middleware/auth');
const { requireRole, enforceClientProjectScope } = require('../middleware/rbac');
const labor = require('../controllers/laborController');
const logistics = require('../controllers/logisticsController');
const compliance = require('../controllers/complianceController');
const invoices = require('../controllers/invoiceController');

router.use(authenticate);
router.use(enforceClientProjectScope); // clients can never reach this (see rbac.js) but defense in depth

// Labor/wages: never visible to receptionist or client (spec: wages restricted)
router.get('/labor', requireRole('admin_director', 'accountant'), labor.listLaborLogs);
router.post('/labor', requireRole('admin_director', 'accountant'), labor.createLaborLog);

// Logistics: admin/accountant can log; receptionist can view (timelines) but not log
router.get('/logistics', requireRole('admin_director', 'accountant', 'receptionist'), logistics.listLogistics);
router.post('/logistics', requireRole('admin_director', 'accountant'), logistics.createLogisticsCost);

// Compliance: admin/accountant only
router.get('/compliance', requireRole('admin_director', 'accountant'), compliance.listCompliance);
router.post('/compliance', requireRole('admin_director', 'accountant'), compliance.createComplianceCost);

// Client invoices (revenue side, drives Gross Profit): admin/accountant only
router.get('/invoices', requireRole('admin_director', 'accountant'), invoices.listInvoices);
router.post('/invoices', requireRole('admin_director', 'accountant'), invoices.createInvoice);

module.exports = router;

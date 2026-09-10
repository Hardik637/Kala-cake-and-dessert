const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Owner Authentication (Single Owner: Username + Password)
router.post('/login', adminController.login);
router.get('/verify', adminAuthMiddleware, adminController.verifyToken);
router.put('/credentials', adminAuthMiddleware, adminController.updateCredentials);

// Owner Dashboard & Operations
router.get('/metrics', adminAuthMiddleware, adminController.getDashboardMetrics);
router.get('/customers', adminAuthMiddleware, adminController.getCustomers);
router.get('/customers/:id', adminAuthMiddleware, adminController.getCustomerDetails);

module.exports = router;

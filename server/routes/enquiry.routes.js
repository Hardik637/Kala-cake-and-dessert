const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Customer
router.post('/', enquiryController.submitEnquiry);

// Admin Protected
router.get('/admin/all', adminAuthMiddleware, enquiryController.getAllEnquiries);
router.patch('/admin/:id', adminAuthMiddleware, enquiryController.updateEnquiry);

module.exports = router;

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Customer Protected Routes (Authentication Required)
router.post('/', authMiddleware, orderController.placeOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);

// Razorpay Payment Gateway Routes
router.get('/razorpay/config', orderController.getRazorpayConfig);
router.post('/razorpay/create-order', authMiddleware, orderController.createRazorpayOrder);
router.post('/razorpay/verify-payment', authMiddleware, orderController.verifyRazorpayPayment);
router.post('/razorpay/webhook', orderController.handleRazorpayWebhook);

// Public Order Tracking (Strictly by tracking_token - User Correction 1)
router.get('/track/:tracking_token', orderController.getOrderTracking);

// Admin Protected Routes
router.get('/admin/all', adminAuthMiddleware, orderController.getAllOrders);
router.get('/admin/:id', adminAuthMiddleware, orderController.getOrderDetails);
router.patch('/admin/:id/status', adminAuthMiddleware, orderController.updateOrderStatus);
router.post('/admin/:id/reverse-milestone', adminAuthMiddleware, orderController.reverseMilestoneCredit);

module.exports = router;

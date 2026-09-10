const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Customer Protected Routes (Authentication Required)
router.get('/my-status', authMiddleware, rewardController.getMyRewardStatus);

// Admin Protected Routes
router.get('/admin/config', adminAuthMiddleware, rewardController.getRewardConfig);
router.put('/admin/config', adminAuthMiddleware, rewardController.updateRewardConfig);
router.get('/admin/unlocked', adminAuthMiddleware, rewardController.getUnlockedRewards);
router.post('/admin/redeem/:milestoneId', adminAuthMiddleware, rewardController.redeemCustomerReward);
router.get('/admin/audit-logs', adminAuthMiddleware, rewardController.getAuditLogs);

module.exports = router;

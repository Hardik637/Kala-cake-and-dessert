const dbService = require('../services/dbService');
const brandConfig = require('../config/brand.config');

/**
 * Customer: Get My Milestone Status
 * GET /api/rewards/my-status
 * Strictly requires authenticated customer session.
 */
exports.getMyMilestoneStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const activeMilestone = await dbService.getUserActiveMilestone(userId);
    const history = await dbService.getUserMilestoneHistory(userId);
    const orders = await dbService.getUserOrders(userId);

    return res.json({
      activeMilestone,
      history,
      totalOrders: orders.length,
    });
  } catch (err) {
    console.error('My milestone status error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve milestone status.' });
  }
};

exports.getMyRewardStatus = exports.getMyMilestoneStatus;

/**
 * Admin: Get active reward configuration
 * GET /api/rewards/admin/config
 */
exports.getRewardConfig = async (req, res) => {
  try {
    const config = await dbService.getActiveReward();
    return res.json({ config });
  } catch (err) {
    console.error('Get reward config error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch reward configuration.' });
  }
};

/**
 * Admin: Update reward configuration
 * PUT /api/rewards/admin/config
 */
exports.updateRewardConfig = async (req, res) => {
  try {
    const { id, name, description, required_orders } = req.body;
    if (!name || !required_orders) {
      return res.status(400).json({ error: 'Reward name and required completed orders are required.' });
    }

    const reqOrdersInt = parseInt(required_orders, 10);
    if (isNaN(reqOrdersInt) || reqOrdersInt <= 0 || reqOrdersInt > 100) {
      return res.status(400).json({ error: 'Required completed orders must be a number between 1 and 100.' });
    }

    const rewardId = id || 1;
    const updated = await dbService.updateReward(rewardId, {
      name: name.trim(),
      description: description ? description.trim() : null,
      required_orders: reqOrdersInt,
      active: 1,
    });

    return res.json({ message: 'Milestone reward configuration updated.', config: updated });
  } catch (err) {
    console.error('Update reward config error:', err.message);
    return res.status(500).json({ error: 'Failed to update reward configuration.' });
  }
};

/**
 * Admin: Get all unlocked rewards waiting for redemption
 * GET /api/rewards/admin/unlocked
 */
exports.getUnlockedRewards = async (req, res) => {
  try {
    const data = await dbService.getUnlockedRewards();
    return res.json(data);
  } catch (err) {
    console.error('Unlocked rewards fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch unlocked rewards.' });
  }
};

/**
 * Admin: Redeem Customer Reward (Atomic Transaction)
 * POST /api/rewards/admin/redeem/:milestoneId
 */
exports.redeemCustomerReward = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { notes } = req.body;
    const adminId = req.admin ? req.admin.id : 'owner';
    const adminName = req.admin ? req.admin.name : 'Boutique Owner';

    const result = await dbService.redeemRewardAtomic(milestoneId, notes, adminId, adminName);

    return res.json({
      message: result.message || 'Reward successfully redeemed.',
      result,
    });
  } catch (err) {
    console.error('Redeem reward error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to process reward redemption.' });
  }
};

/**
 * Admin: Get all milestone audit logs
 * GET /api/rewards/admin/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs();
    return res.json({ logs });
  } catch (err) {
    console.error('Milestone audit logs error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve milestone audit logs.' });
  }
};

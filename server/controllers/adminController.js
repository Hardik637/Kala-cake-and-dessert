const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbService = require('../services/dbService');
const brandConfig = require('../config/brand.config');

/**
 * Owner Admin Login
 * POST /api/admin/login
 * Strictly Username + Password, verified via bcrypt against the single owner account (admins/owner).
 * Updates last_login_at timestamp upon success.
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = await dbService.getAdminByUsername(username.trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid owner credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid owner credentials.' });
    }

    // Record last_login_at on admins/owner
    const now = new Date().toISOString();
    await dbService.updateAdminCredentials('owner', { last_login_at: now });

    const currentTokenVersion = admin.token_version || 1;

    const token = jwt.sign(
      {
        adminId: 'owner',
        id: 'owner',
        username: admin.username,
        role: 'admin',
        token_version: currentTokenVersion,
      },
      brandConfig.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Owner authorization granted.',
      token,
      admin: {
        id: 'owner',
        adminId: 'owner',
        username: admin.username,
        name: admin.name,
        email: admin.email,
        last_login_at: now,
      },
    });
  } catch (err) {
    console.error('Owner login error:', err.message);
    return res.status(500).json({ error: 'Server error during owner authentication.' });
  }
};

/**
 * Verify Owner Session
 * GET /api/admin/verify
 */
exports.verifyToken = (req, res) => {
  return res.json({
    valid: true,
    admin: {
      id: 'owner',
      adminId: 'owner',
      username: req.admin.username,
      name: req.admin.name,
      email: req.admin.email,
      last_login_at: req.admin.last_login_at || null,
    },
  });
};

/**
 * Update Owner Credentials (Username / Password)
 * PUT /api/admin/credentials
 * Requires current_password verification. Strictly updates admins/owner.
 * Enforces 12+ character minimum for new password.
 * Increments token_version to invalidate previous owner sessions.
 */
exports.updateCredentials = async (req, res) => {
  try {
    const { current_password, new_username, new_password, name, email } = req.body;

    if (!current_password) {
      return res.status(400).json({ error: 'Current password is required to update credentials.' });
    }

    const owner = await dbService.getAdminById('owner');
    if (!owner) {
      return res.status(404).json({ error: 'Owner account not found.' });
    }

    const isMatch = bcrypt.compareSync(current_password, owner.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password does not match.' });
    }

    const updatePayload = {};
    let credentialsChanged = false;

    if (new_username && new_username.trim()) {
      const cleanUsername = new_username.trim().toLowerCase();
      if (cleanUsername.length < 3 || cleanUsername.length > 50) {
        return res.status(400).json({ error: 'Username must be between 3 and 50 characters.' });
      }
      updatePayload.username = cleanUsername;
      credentialsChanged = true;
    }

    if (new_password) {
      if (typeof new_password !== 'string' || new_password.length < 12) {
        return res.status(400).json({ error: 'New password must be at least 12 characters long.' });
      }
      const salt = bcrypt.genSaltSync(10);
      updatePayload.password_hash = bcrypt.hashSync(new_password, salt);
      credentialsChanged = true;
    }

    if (name && name.trim()) updatePayload.name = name.trim();
    if (email && email.trim()) updatePayload.email = email.trim().toLowerCase();

    // Invalidate previous sessions by incrementing token_version
    if (credentialsChanged) {
      updatePayload.token_version = (owner.token_version || 1) + 1;
    }

    const updated = await dbService.updateAdminCredentials('owner', updatePayload);

    // Generate new token with updated token_version
    const newToken = jwt.sign(
      {
        adminId: 'owner',
        id: 'owner',
        username: updated.username,
        role: 'admin',
        token_version: updated.token_version || 1,
      },
      brandConfig.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Owner credentials updated successfully.',
      token: newToken,
      admin: {
        id: 'owner',
        adminId: 'owner',
        username: updated.username,
        name: updated.name,
        email: updated.email,
        last_login_at: updated.last_login_at || null,
      },
    });
  } catch (err) {
    console.error('Update credentials error:', err.message);
    return res.status(500).json({ error: 'Failed to update owner credentials: ' + err.message });
  }
};

/**
 * Dashboard Overview & Metrics
 * GET /api/admin/metrics
 */
exports.getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await dbService.getDashboardMetrics();
    return res.json(metrics);
  } catch (err) {
    console.error('Dashboard metrics error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
};

/**
 * Customers CRM List
 * GET /api/admin/customers
 */
exports.getCustomers = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const customers = await dbService.getCustomers(parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
    return res.json({ customers });
  } catch (err) {
    console.error('Customer list error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
};

/**
 * Customer Details
 * GET /api/admin/customers/:id
 */
exports.getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.params.id;
    const details = await dbService.getCustomerDetails(customerId);

    if (!details || (!details.customer && !details.user)) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    return res.json(details);
  } catch (err) {
    console.error('Customer details error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve customer details.' });
  }
};

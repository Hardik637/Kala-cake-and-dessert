const jwt = require('jsonwebtoken');
const brandConfig = require('../config/brand.config');
const dbService = require('../services/dbService');

async function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Owner access required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, brandConfig.JWT_SECRET);

    // Customer tokens must never work on admin routes
    if (decoded.role !== 'admin' || (decoded.adminId !== 'owner' && decoded.id !== 'owner')) {
      return res.status(403).json({ error: 'Forbidden. Boutique owner privileges required.' });
    }

    // Strictly resolve single owner account: admins/owner exists
    const admin = await dbService.getAdminById('owner');
    if (!admin) {
      return res.status(401).json({ error: 'Owner account not found in database.' });
    }

    // Invalidate previous sessions if credentials were changed
    if (admin.token_version && decoded.token_version && decoded.token_version !== admin.token_version) {
      return res.status(401).json({ error: 'Owner session invalidated due to credential change. Please log in again.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Owner session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid owner authorization token.' });
  }
}

module.exports = adminAuthMiddleware;

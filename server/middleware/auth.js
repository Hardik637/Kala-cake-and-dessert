const jwt = require('jsonwebtoken');
const brandConfig = require('../config/brand.config');
const dbService = require('../services/dbService');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Customer authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, brandConfig.JWT_SECRET);
    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Forbidden. Invalid customer session.' });
    }

    const user = await dbService.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Customer account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, brandConfig.JWT_SECRET);
    if (decoded.role === 'customer') {
      const user = await dbService.getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
}

authMiddleware.optional = optionalAuth;
module.exports = authMiddleware;

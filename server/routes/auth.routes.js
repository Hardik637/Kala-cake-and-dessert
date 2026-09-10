const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Google Identity Services (GIS) / OpenID Connect Authentication
router.post('/google', authController.googleAuth);
router.post('/google/complete-profile', authController.completeGoogleProfile);
router.get('/google/config', authController.getGoogleConfig);

// Customer Profile Management (Protected with customer JWT)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;

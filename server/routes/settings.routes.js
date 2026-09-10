const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Public
router.get('/', settingsController.getSettings);

// Admin Protected
router.put('/', adminAuthMiddleware, settingsController.updateSettings);

module.exports = router;

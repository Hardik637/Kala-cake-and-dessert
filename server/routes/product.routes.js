const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Public
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);

// Admin Protected
router.post('/', adminAuthMiddleware, productController.createProduct);
router.put('/:id', adminAuthMiddleware, productController.updateProduct);
router.patch('/:id/toggle-availability', adminAuthMiddleware, productController.toggleAvailability);
router.delete('/:id', adminAuthMiddleware, productController.deleteProduct);

module.exports = router;

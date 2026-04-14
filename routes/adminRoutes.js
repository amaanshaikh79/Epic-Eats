const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../middleware/upload');
const {
    getStats,
    getProducts, createProduct, updateProduct, deleteProduct,
    getOrders, updateOrderStatus,
    getUsers
} = require('../controllers/adminController');

// All admin routes require auth + admin
router.use(auth, admin);

// Stats
router.get('/stats', getStats);

// Users (Customers)
router.get('/users', getUsers);

// Products
router.get('/products', getProducts);
router.post('/products', upload.single('image'), createProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;

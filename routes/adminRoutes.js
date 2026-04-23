const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { upload } = require('../middleware/upload');
const {
    getStats,
    getProducts, createProduct, updateProduct, deleteProduct,
    getOrders, updateOrderStatus,
    getUsers, updateUser, deleteUser
} = require('../controllers/adminController');
const {
    getDeliveryPartners, createDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner,
    assignDeliveryPartner
} = require('../controllers/deliveryController');

// All admin routes require auth + admin
router.use(auth, admin);

// Stats
router.get('/stats', getStats);

// Users (Customers)
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Products
router.get('/products', getProducts);
router.post('/products', upload.single('image'), createProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/assign', assignDeliveryPartner);

// Delivery Partners
router.get('/delivery-partners', getDeliveryPartners);
router.post('/delivery-partners', createDeliveryPartner);
router.put('/delivery-partners/:id', updateDeliveryPartner);
router.delete('/delivery-partners/:id', deleteDeliveryPartner);

module.exports = router;

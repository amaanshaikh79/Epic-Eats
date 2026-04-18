const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, verifyPayment, getInvoice } = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.post('/', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.get('/', auth, getMyOrders);
router.get('/:id/invoice', auth, getInvoice);
router.get('/:id', auth, getOrder);

module.exports = router;


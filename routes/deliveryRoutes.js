const express = require('express');
const router = express.Router();
const {
    trackOrder,
    updateLocation,
    updateOrderStatusByPartner,
    getPartnerOrder
} = require('../controllers/deliveryController');

// Public tracking — no auth required
router.get('/track/:orderId/:token', trackOrder);

// Partner endpoints (would be auth-protected in production with partner JWT)
router.put('/location/:partnerId', updateLocation);
router.put('/order/:orderId/status', updateOrderStatusByPartner);
router.get('/partner/:partnerId/order', getPartnerOrder);

module.exports = router;

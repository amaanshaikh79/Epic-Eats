const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, getMe, updateProfile, addAddress, updateAddress, deleteAddress, sendPhoneOTP, verifyPhoneOTP, sendEmailVerification, verifyEmailVerification } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Optional auth middleware — attaches user if token present, but doesn't block
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: decoded.id };
        } catch {}
    }
    next();
};

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.post('/address', auth, addAddress);
router.put('/address/:addressId', auth, updateAddress);
router.delete('/address/:addressId', auth, deleteAddress);

// Phone OTP routes
router.post('/send-otp', sendPhoneOTP);
router.post('/verify-otp', optionalAuth, verifyPhoneOTP);

// Email OTP routes
router.post('/send-email-otp', sendEmailVerification);
router.post('/verify-email-otp', verifyEmailVerification);

module.exports = router;

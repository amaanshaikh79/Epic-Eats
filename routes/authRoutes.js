const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, addAddress, updateAddress, deleteAddress } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.post('/address', auth, addAddress);
router.put('/address/:addressId', auth, updateAddress);
router.delete('/address/:addressId', auth, deleteAddress);

module.exports = router;

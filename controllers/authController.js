const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../utils/sms');
const { sendEmailOTP, verifyEmailOTP, sendWelcomeEmail } = require('../utils/email');

// Validate email format and catch common typos like double .com
const isValidEmail = (email) => {
    // Standard email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    // Reject repeated TLD patterns like .com.com, .in.in, .org.org
    const domain = email.split('@')[1];
    if (/\.(com|net|org|in|co|io|dev)\.\1$/i.test(domain)) return false;
    if (/\.(com){2,}/i.test(domain)) return false;

    return true;
};

// Generate short-lived Access Token (15 minutes)
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
};

// Generate long-lived Refresh Token (7 days)
const generateRefreshToken = (id) => {
    return jwt.sign({ id, type: 'refresh' }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// Hash refresh token for safe DB storage
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { fullName, password, phone } = req.body;
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide fullName, email, and password'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const user = await User.create({ fullName, email, password, phone: phone || '' });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Store hashed refresh token in DB
        user.refreshToken = hashToken(refreshToken);
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                addresses: user.addresses
            }
        });

        // Send welcome email (non-blocking)
        sendWelcomeEmail({ fullName, email, phone: phone || '' });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Store hashed refresh token in DB
        user.refreshToken = hashToken(refreshToken);
        await user.save();

        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                addresses: user.addresses
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token using refresh token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify the refresh token JWT
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token. Please login again.'
            });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type.'
            });
        }

        // Find user and validate stored refresh token
        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user || !user.refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token. Please login again.'
            });
        }

        // Compare hashed tokens
        const hashedIncoming = hashToken(refreshToken);
        if (hashedIncoming !== user.refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been revoked. Please login again.'
            });
        }

        // Issue new tokens (token rotation for extra security)
        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        // Store new hashed refresh token
        user.refreshToken = hashToken(newRefreshToken);
        await user.save();

        res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout — invalidate refresh token
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
    try {
        // Clear the stored refresh token
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                addresses: user.addresses,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { fullName, phone } = req.body;
        const updates = {};
        if (fullName) updates.fullName = fullName;
        if (phone !== undefined) updates.phone = phone;

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            message: 'Profile updated',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                addresses: user.addresses
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add address
// @route   POST /api/auth/address
exports.addAddress = async (req, res, next) => {
    try {
        const { label, street, city, state, pinCode, phone, isDefault } = req.body;

        if (!street || !city || !state || !pinCode || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide street, city, state, pinCode, and phone'
            });
        }

        const user = await User.findById(req.user.id);

        // If this is set as default, unset other defaults
        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        // If first address, make it default
        const makeDefault = user.addresses.length === 0 ? true : (isDefault || false);

        user.addresses.push({ label, street, city, state, pinCode, phone, isDefault: makeDefault });
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Address added',
            addresses: user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update address
// @route   PUT /api/auth/address/:addressId
exports.updateAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const { label, street, city, state, pinCode, phone, isDefault } = req.body;

        if (isDefault) {
            user.addresses.forEach(addr => { addr.isDefault = false; });
        }

        if (label) address.label = label;
        if (street) address.street = street;
        if (city) address.city = city;
        if (state) address.state = state;
        if (pinCode) address.pinCode = pinCode;
        if (phone) address.phone = phone;
        if (isDefault !== undefined) address.isDefault = isDefault;

        await user.save();

        res.json({
            success: true,
            message: 'Address updated',
            addresses: user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete address
// @route   DELETE /api/auth/address/:addressId
exports.deleteAddress = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.deleteOne();
        await user.save();

        // If we deleted the default, set first remaining as default
        if (user.addresses.length > 0 && !user.addresses.some(a => a.isDefault)) {
            user.addresses[0].isDefault = true;
            await user.save();
        }

        res.json({
            success: true,
            message: 'Address deleted',
            addresses: user.addresses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send OTP for phone verification
// @route   POST /api/auth/send-otp
exports.sendPhoneOTP = async (req, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const result = await sendOTP(phone);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyPhoneOTP = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const result = verifyOTP(phone, otp);

        if (result.success && req.user) {
            // If user is logged in, mark their phone as verified
            await User.findByIdAndUpdate(req.user.id, {
                phone,
                isPhoneVerified: true
            });
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Send Email OTP for verification
// @route   POST /api/auth/send-email-otp
exports.sendEmailVerification = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if email is already registered
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered'
            });
        }

        const result = await sendEmailOTP(email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email-otp
exports.verifyEmailVerification = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        const result = verifyEmailOTP(email, otp);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

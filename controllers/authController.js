const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide fullName, email, and password'
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

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
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

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
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

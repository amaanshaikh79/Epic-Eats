const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const { processImage } = require('../middleware/upload');

// ── Dashboard Stats ──

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
    try {
        const [totalProducts, totalOrders, totalUsers, revenueResult] = await Promise.all([
            MenuItem.countDocuments(),
            Order.countDocuments(),
            User.countDocuments({ role: 'user' }),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ])
        ]);

        const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Orders by status
        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalProducts,
                totalOrders,
                totalUsers,
                revenue,
                ordersByStatus
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── Product Management ──

// @desc    Get all products (admin — includes inactive)
// @route   GET /api/admin/products
exports.getProducts = async (req, res, next) => {
    try {
        const { search, category, page, limit: limitParam } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ name: regex }, { description: regex }];
        }

        const pageNum = parseInt(page) || 1;
        const limit = parseInt(limitParam) || 50;
        const skip = (pageNum - 1) * limit;

        const [products, total] = await Promise.all([
            MenuItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            MenuItem.countDocuments(filter)
        ]);

        res.json({
            success: true,
            products,
            total,
            page: pageNum,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create product
// @route   POST /api/admin/products
exports.createProduct = async (req, res, next) => {
    try {
        const { name, description, price, category, isVeg, stock, unit } = req.body;

        let image = req.body.image || '';

        // If file uploaded, process it
        if (req.file) {
            image = await processImage(req.file);
        }

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Product image is required'
            });
        }

        const product = await MenuItem.create({
            name, description, price, image, category,
            isVeg: isVeg === 'true' || isVeg === true,
            stock: parseInt(stock) || 50,
            unit: unit || 'plate'
        });

        res.status(201).json({
            success: true,
            message: 'Product created',
            product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
exports.updateProduct = async (req, res, next) => {
    try {
        const updates = { ...req.body };

        // Handle boolean conversion
        if (updates.isVeg !== undefined) {
            updates.isVeg = updates.isVeg === 'true' || updates.isVeg === true;
        }
        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true' || updates.isActive === true;
        }
        if (updates.stock !== undefined) {
            updates.stock = parseInt(updates.stock);
        }
        if (updates.price !== undefined) {
            updates.price = parseFloat(updates.price);
        }

        // If new image uploaded
        if (req.file) {
            updates.image = await processImage(req.file);
        }

        const product = await MenuItem.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated',
            product
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft delete product
// @route   DELETE /api/admin/products/:id
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deactivated',
            product
        });
    } catch (error) {
        next(error);
    }
};

// ── Order Management ──

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
exports.getOrders = async (req, res, next) => {
    try {
        const { status, page, limit: limitParam } = req.query;

        const filter = {};
        if (status) filter.status = status;

        const pageNum = parseInt(page) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (pageNum - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('user', 'fullName email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter)
        ]);

        res.json({
            success: true,
            orders,
            total,
            page: pageNum,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const updates = { status };

        // Auto-mark COD orders as paid when delivered
        if (status === 'delivered') {
            updates.paymentStatus = 'paid';
        }

        // If cancelled, restore stock
        if (status === 'cancelled') {
            const order = await Order.findById(req.params.id);
            if (order && order.status !== 'cancelled') {
                for (const item of order.items) {
                    await MenuItem.findByIdAndUpdate(item.menuItem, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
        }

        const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true })
            .populate('user', 'fullName email phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });
    } catch (error) {
        next(error);
    }
};

// ── User Management ──

// @desc    Get all users (customers)
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
    try {
        const { search, page, limit: limitParam } = req.query;

        const filter = { role: 'user' }; // only fetch regular customers
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
        }

        const pageNum = parseInt(page) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (pageNum - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password') // explicitly don't fetch password
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter)
        ]);

        res.json({
            success: true,
            users,
            total,
            page: pageNum,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

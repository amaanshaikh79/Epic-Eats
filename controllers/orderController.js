const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// @desc    Create a new order
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
    try {
        const { items, deliveryAddress, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must have at least one item'
            });
        }

        if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pinCode || !deliveryAddress.phone) {
            return res.status(400).json({
                success: false,
                message: 'Complete delivery address is required'
            });
        }

        // Validate stock & calculate total
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItem);
            if (!menuItem || !menuItem.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `Item "${item.name || 'Unknown'}" is no longer available`
                });
            }

            if (menuItem.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${menuItem.name}". Available: ${menuItem.stock}`
                });
            }

            subtotal += menuItem.price * item.quantity;
            orderItems.push({
                menuItem: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: item.quantity,
                unit: menuItem.unit
            });
        }

        // Delivery fee: free above ₹500
        const deliveryFee = subtotal >= 500 ? 0 : 40;
        const totalAmount = subtotal + deliveryFee;

        // Deduct stock
        for (const item of orderItems) {
            await MenuItem.findByIdAndUpdate(item.menuItem, {
                $inc: { stock: -item.quantity }
            });
        }

        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            totalAmount,
            deliveryFee,
            deliveryAddress,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
            status: 'confirmed'
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders
exports.getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

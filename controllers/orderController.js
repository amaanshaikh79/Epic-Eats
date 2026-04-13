const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendOrderConfirmation } = require('../utils/sms');
const { sendOrderEmail } = require('../utils/email');

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
            paymentStatus: 'pending',
            status: paymentMethod === 'online' ? 'pending' : 'confirmed'
        });

        if (paymentMethod === 'online') {
            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const options = {
                amount: totalAmount * 100, // amount in smallest currency unit (paise)
                currency: "INR",
                receipt: `receipt_order_${order._id}`,
            };

            const rzpOrder = await instance.orders.create(options);
            if (!rzpOrder) return res.status(500).json({ success: false, message: "Some error occured with Razorpay" });

            order.razorpayOrderId = rzpOrder.id;
            await order.save();

            return res.status(201).json({
                success: true,
                message: 'Order created, awaiting payment',
                order,
                razorpayOrderId: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            });
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order
        });

        // Send SMS confirmation for COD orders (non-blocking)
        if (order.deliveryAddress?.phone) {
            sendOrderConfirmation(order.deliveryAddress.phone, order);
        }

        // Send order confirmation email (non-blocking)
        const user = await User.findById(req.user.id);
        if (user?.email) {
            sendOrderEmail(user.email, order);
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Verify Razorpay payment
// @route   POST /api/orders/verify
exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            const order = await Order.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { paymentStatus: 'paid', paymentId: razorpay_payment_id, status: 'confirmed' },
                { new: true }
            );

            // Send SMS confirmation after successful online payment (non-blocking)
            if (order?.deliveryAddress?.phone) {
                sendOrderConfirmation(order.deliveryAddress.phone, order);
            }

            // Send order confirmation email after payment (non-blocking)
            const paidOrder = await Order.findById(order._id);
            const user = await User.findById(paidOrder?.user);
            if (user?.email) {
                sendOrderEmail(user.email, order);
            }

            return res.status(200).json({ success: true, message: "Payment verified successfully", order });
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment signature!" });
        }
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

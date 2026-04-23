const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');
const { sendDeliveryAssignmentEmail, sendTrackingEmail } = require('../utils/email');
const { isValidCoordinate, isMovementConsistent } = require('../utils/geo');
const { assignPartnerToOrder, freePartner, buildFrontendUrl } = require('../utils/assignmentService');

// ── Delivery Partner CRUD ──

// @desc    Get all delivery partners
// @route   GET /api/admin/delivery-partners
exports.getDeliveryPartners = async (req, res, next) => {
    try {
        const { search, available, page, limit: limitParam } = req.query;

        const filter = {};
        if (available === 'true') filter.isAvailable = true;
        if (available === 'false') filter.isAvailable = false;
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }

        const pageNum = parseInt(page) || 1;
        const limit = parseInt(limitParam) || 50;
        const skip = (pageNum - 1) * limit;

        const [partners, total] = await Promise.all([
            DeliveryPartner.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            DeliveryPartner.countDocuments(filter)
        ]);

        res.json({
            success: true,
            partners,
            total,
            page: pageNum,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create delivery partner
// @route   POST /api/admin/delivery-partners
exports.createDeliveryPartner = async (req, res, next) => {
    try {
        const { name, phone, email, vehicleType, vehicleNumber } = req.body;

        if (!name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone, and email are required'
            });
        }

        const existing = await DeliveryPartner.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Delivery partner with this email already exists'
            });
        }

        const partner = await DeliveryPartner.create({
            name, phone, email,
            vehicleType: vehicleType || 'bike',
            vehicleNumber: vehicleNumber || ''
        });

        res.status(201).json({
            success: true,
            message: 'Delivery partner created',
            partner
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update delivery partner
// @route   PUT /api/admin/delivery-partners/:id
exports.updateDeliveryPartner = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (updates.isAvailable !== undefined) {
            updates.isAvailable = updates.isAvailable === 'true' || updates.isAvailable === true;
        }
        if (updates.isActive !== undefined) {
            updates.isActive = updates.isActive === 'true' || updates.isActive === true;
        }

        const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        res.json({
            success: true,
            message: 'Delivery partner updated',
            partner
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete delivery partner
// @route   DELETE /api/admin/delivery-partners/:id
exports.deleteDeliveryPartner = async (req, res, next) => {
    try {
        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.params.id,
            { isActive: false, isAvailable: false },
            { new: true }
        );

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        res.json({
            success: true,
            message: 'Delivery partner deactivated',
            partner
        });
    } catch (error) {
        next(error);
    }
};

// ── Manual Assign Delivery Partner to Order (Admin) ──

// @desc    Assign delivery partner to an order
// @route   PUT /api/admin/orders/:id/assign
exports.assignDeliveryPartner = async (req, res, next) => {
    try {
        const { deliveryPartnerId } = req.body;

        if (!deliveryPartnerId) {
            return res.status(400).json({
                success: false,
                message: 'Delivery partner ID is required'
            });
        }

        const partner = await DeliveryPartner.findById(deliveryPartnerId);
        if (!partner || !partner.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found or inactive'
            });
        }

        // Generate tracking token
        const trackingToken = crypto.randomBytes(16).toString('hex');

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                deliveryPartner: deliveryPartnerId,
                trackingToken,
                status: 'assigned',
                assignedAt: new Date()
            },
            { new: true }
        )
            .populate('user', 'fullName email phone')
            .populate('deliveryPartner');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Mark partner as unavailable and link order
        partner.isAvailable = false;
        partner.currentOrder = order._id;
        await partner.save();

        const frontendUrl = buildFrontendUrl(req);
        const trackingLink = `${frontendUrl}/track/${order._id}/${trackingToken}`;

        // Send notification email to customer with tracking link (non-blocking)
        if (order.user?.email) {
            sendTrackingEmail(order.user.email, order, partner, trackingLink);
        }

        // Send notification email to delivery partner (non-blocking)
        if (partner.email) {
            sendDeliveryAssignmentEmail(partner, order);
        }

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit(`order-${order._id}`, {
                type: 'status_update',
                status: 'assigned',
                partner: {
                    name: partner.name,
                    phone: partner.phone,
                    vehicleType: partner.vehicleType,
                    vehicleNumber: partner.vehicleNumber
                },
                trackingLink
            });
        }

        res.json({
            success: true,
            message: `Delivery partner ${partner.name} assigned to order`,
            order,
            trackingLink
        });
    } catch (error) {
        next(error);
    }
};

// ── Partner Status Updates (called from partner's device) ──

// @desc    Update order status from partner (picked_up, out_for_delivery, delivered)
// @route   PUT /api/delivery/order/:orderId/status
exports.updateOrderStatusByPartner = async (req, res, next) => {
    try {
        const { status, partnerId } = req.body;

        const validTransitions = {
            'assigned': ['picked_up'],
            'picked_up': ['out_for_delivery'],
            'out_for_delivery': ['delivered']
        };

        const order = await Order.findById(req.params.orderId)
            .populate('deliveryPartner')
            .populate('user', 'fullName email');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Verify this partner is assigned to this order
        if (!order.deliveryPartner || order.deliveryPartner._id.toString() !== partnerId) {
            return res.status(403).json({ success: false, message: 'Not authorized for this order' });
        }

        // Validate status transition
        const allowed = validTransitions[order.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from "${order.status}" to "${status}"`
            });
        }

        order.status = status;

        // Auto-mark COD as paid on delivery
        if (status === 'delivered') {
            if (order.paymentMethod === 'cod') {
                order.paymentStatus = 'paid';
            }
        }

        await order.save();

        // Free partner on delivery
        if (status === 'delivered') {
            const io = req.app.get('io');
            await freePartner(order._id, io);
        }

        // Emit real-time status update
        const io = req.app.get('io');
        if (io) {
            io.emit(`order-${order._id}`, {
                type: 'status_update',
                status: order.status
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

// @desc    Get partner's current assigned order
// @route   GET /api/delivery/partner/:partnerId/order
exports.getPartnerOrder = async (req, res, next) => {
    try {
        const partner = await DeliveryPartner.findById(req.params.partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, message: 'Partner not found' });
        }

        const order = await Order.findOne({
            deliveryPartner: partner._id,
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
        }).populate('user', 'fullName phone');

        if (!order) {
            return res.json({ success: true, order: null, message: 'No active order' });
        }

        res.json({
            success: true,
            order: {
                _id: order._id,
                status: order.status,
                items: order.items,
                totalAmount: order.totalAmount,
                deliveryAddress: order.deliveryAddress,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                customer: order.user ? {
                    name: order.user.fullName,
                    phone: order.user.phone
                } : null,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── Public Track Order ──

// @desc    Get order tracking info (public — no auth required)
// @route   GET /api/delivery/track/:orderId/:token
exports.trackOrder = async (req, res, next) => {
    try {
        const { orderId, token } = req.params;

        const order = await Order.findOne({
            _id: orderId,
            trackingToken: token
        })
            .populate('deliveryPartner')
            .populate('user', 'fullName');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Invalid tracking link'
            });
        }

        res.json({
            success: true,
            tracking: {
                orderId: order._id,
                status: order.status,
                items: order.items,
                totalAmount: order.totalAmount,
                deliveryFee: order.deliveryFee,
                deliveryAddress: order.deliveryAddress,
                deliveryPartner: order.deliveryPartner ? {
                    _id: order.deliveryPartner._id,
                    name: order.deliveryPartner.name,
                    phone: order.deliveryPartner.phone,
                    vehicleType: order.deliveryPartner.vehicleType,
                    vehicleNumber: order.deliveryPartner.vehicleNumber,
                    currentLocation: order.deliveryPartner.currentLocation,
                    lastLocationAt: order.deliveryPartner.lastLocationAt
                } : null,
                customerName: order.user?.fullName,
                createdAt: order.createdAt,
                assignedAt: order.assignedAt,
                assignmentRetries: order.assignmentRetries
            }
        });
    } catch (error) {
        next(error);
    }
};

// ── Update Delivery Partner Location (called from partner's device) ──

// @desc    Update delivery partner live location
// @route   PUT /api/delivery/location/:partnerId
exports.updateLocation = async (req, res, next) => {
    try {
        const { lat, lng } = req.body;

        // Validate coordinates
        if (!isValidCoordinate(lat, lng)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates. lat must be -90 to 90, lng must be -180 to 180. (0,0) is not allowed.'
            });
        }

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        const partner = await DeliveryPartner.findById(req.params.partnerId);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        // Movement consistency check
        const now = new Date();
        if (partner.currentLocation && isValidCoordinate(partner.currentLocation.lat, partner.currentLocation.lng)) {
            const consistent = isMovementConsistent(
                partner.currentLocation.lat,
                partner.currentLocation.lng,
                partner.currentLocation.updatedAt,
                parsedLat,
                parsedLng,
                now
            );
            if (!consistent) {
                return res.status(400).json({
                    success: false,
                    message: 'Location update rejected: movement speed exceeds realistic limits'
                });
            }
        }

        // Store previous location for validation chain
        partner.previousLocation = {
            lat: partner.currentLocation.lat,
            lng: partner.currentLocation.lng,
            updatedAt: partner.currentLocation.updatedAt
        };

        // Update current location
        partner.currentLocation = {
            lat: parsedLat,
            lng: parsedLng,
            updatedAt: now
        };
        partner.lastLocationAt = now;

        await partner.save();

        // Emit via socket.io for real-time tracking
        const io = req.app.get('io');
        if (io) {
            // Emit to partner-specific channel (for tracking page)
            io.emit(`location-${partner._id}`, {
                lat: parsedLat,
                lng: parsedLng,
                updatedAt: now
            });

            // Also emit to order-specific channel if partner has an active order
            if (partner.currentOrder) {
                io.emit(`order-${partner.currentOrder}`, {
                    type: 'location_update',
                    lat: parsedLat,
                    lng: parsedLng,
                    updatedAt: now
                });
            }
        }

        res.json({ success: true, message: 'Location updated' });
    } catch (error) {
        next(error);
    }
};

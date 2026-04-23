const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unit: { type: String, default: 'plate' }
}, { _id: false });

const orderAddressSchema = new mongoose.Schema({
    label: { type: String, default: 'home' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
    phone: { type: String, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: function (v) { return v && v.length > 0; },
            message: 'Order must have at least one item'
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: 0
    },
    deliveryAddress: {
        type: orderAddressSchema,
        required: [true, 'Delivery address is required']
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online'],
        required: [true, 'Payment method is required'],
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    paymentId: {
        type: String,
        default: ''
    },
    razorpayOrderId: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: [
            'pending',          // awaiting payment (online) or initial state
            'confirmed',        // payment verified / COD accepted
            'preparing',        // kitchen is preparing the food
            'assigned',         // delivery partner assigned, awaiting pickup
            'picked_up',        // partner picked up from restaurant
            'out_for_delivery', // partner is en route to customer
            'delivered',        // order delivered successfully
            'shipped',          // legacy — treated as out_for_delivery
            'cancelled'         // order cancelled
        ],
        default: 'pending'
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        default: null
    },
    trackingToken: {
        type: String,
        default: ''
    },
    // Assignment tracking for retry logic
    assignedAt: {
        type: Date,
        default: null
    },
    assignmentRetries: {
        type: Number,
        default: 0
    },
    lastRetryAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ status: 1, assignmentRetries: 1 }); // for retry queries

module.exports = mongoose.model('Order', orderSchema);

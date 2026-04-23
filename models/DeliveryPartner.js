const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    vehicleType: {
        type: String,
        enum: ['bike', 'scooter', 'bicycle', 'car'],
        default: 'bike'
    },
    vehicleNumber: {
        type: String,
        trim: true,
        default: ''
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    currentLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now }
    },
    // Previous location for movement validation
    previousLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        updatedAt: { type: Date, default: null }
    },
    // Track when partner last sent a real location update
    lastLocationAt: {
        type: Date,
        default: null
    },
    // Currently assigned order (for partner dashboard)
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    rating: {
        type: Number,
        default: 5,
        min: 1,
        max: 5
    },
    totalDeliveries: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

deliveryPartnerSchema.index({ isAvailable: 1, isActive: 1 });
deliveryPartnerSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

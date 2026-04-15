const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    image: {
        type: String,
        required: [true, 'Image URL is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Pizza', 'Burger', 'Biryani', 'North Indian', 'Chinese', 'South Indian', 'Desserts', 'Rolls', 'Popular', 'Starters', 'Main Course', 'Breads & Rice', 'Beverages', 'Fruits', 'Vegetables', 'Dairy', 'Snacks']
    },
    isVeg: {
        type: Boolean,
        required: true,
        default: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 50
    },
    unit: {
        type: String,
        enum: ['kg', 'piece', 'pack', 'plate', 'glass', 'serving'],
        default: 'plate'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient category queries
menuItemSchema.index({ category: 1 });
// Text index for search
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);

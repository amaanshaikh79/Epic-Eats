const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const menuItems = [
    // Popular
    { name: "Butter Chicken", description: "Creamy tomato-based curry with tender chicken pieces", price: 299, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80", category: "Popular", isVeg: false, rating: 4.8, stock: 50, unit: "plate" },
    { name: "Paneer Tikka", description: "Grilled cottage cheese marinated in spices", price: 249, image: "https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=400&q=80", category: "Popular", isVeg: true, rating: 4.7, stock: 40, unit: "plate" },
    { name: "Margherita Pizza", description: "Classic pizza with tomato sauce, mozzarella, and basil", price: 349, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80", category: "Popular", isVeg: true, rating: 4.6, stock: 30, unit: "piece" },
    { name: "Chicken Biryani", description: "Fragrant basmati rice with spiced chicken", price: 279, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80", category: "Popular", isVeg: false, rating: 4.9, stock: 60, unit: "plate" },

    // Starters
    { name: "Spring Rolls", description: "Crispy vegetable rolls with sweet chili sauce", price: 149, image: "https://images.unsplash.com/photo-1620452485617-66ca6fcccc9e?w=400&q=80", category: "Starters", isVeg: true, rating: 4.4, stock: 35, unit: "piece" },
    { name: "Chicken Wings", description: "Spicy buffalo wings with ranch dip", price: 199, image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80", category: "Starters", isVeg: false, rating: 4.5, stock: 25, unit: "plate" },
    { name: "Crispy Corn", description: "Golden fried corn kernels with spices", price: 129, image: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&q=80", category: "Starters", isVeg: true, rating: 4.3, stock: 40, unit: "plate" },
    { name: "Garlic Bread", description: "Toasted bread with garlic butter and herbs", price: 99, image: "https://images.unsplash.com/photo-1573140401552-3fab0b24306f?w=400&q=80", category: "Starters", isVeg: true, rating: 4.2, stock: 50, unit: "piece" },

    // Main Course
    { name: "Dal Makhani", description: "Creamy black lentils slow-cooked with butter", price: 219, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80", category: "Main Course", isVeg: true, rating: 4.7, stock: 45, unit: "plate" },
    { name: "Fish Curry", description: "Fresh fish in tangy coconut curry", price: 329, image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80", category: "Main Course", isVeg: false, rating: 4.6, stock: 20, unit: "plate" },
    { name: "Palak Paneer", description: "Cottage cheese in creamy spinach gravy", price: 229, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80", category: "Main Course", isVeg: true, rating: 4.5, stock: 35, unit: "plate" },
    { name: "Mutton Rogan Josh", description: "Aromatic Kashmiri mutton curry", price: 399, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", category: "Main Course", isVeg: false, rating: 4.8, stock: 15, unit: "plate" },

    // Breads & Rice
    { name: "Butter Naan", description: "Soft tandoori bread brushed with butter", price: 49, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80", category: "Breads & Rice", isVeg: true, rating: 4.6, stock: 100, unit: "piece" },
    { name: "Jeera Rice", description: "Basmati rice tempered with cumin seeds", price: 129, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80", category: "Breads & Rice", isVeg: true, rating: 4.4, stock: 60, unit: "plate" },
    { name: "Garlic Naan", description: "Tandoori bread topped with garlic", price: 59, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80", category: "Breads & Rice", isVeg: true, rating: 4.7, stock: 80, unit: "piece" },
    { name: "Veg Fried Rice", description: "Wok-tossed rice with vegetables", price: 169, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80", category: "Breads & Rice", isVeg: true, rating: 4.5, stock: 40, unit: "plate" },

    // Desserts
    { name: "Gulab Jamun", description: "Soft milk dumplings in rose-flavored syrup", price: 79, image: "https://images.unsplash.com/photo-1589119908995-c6b5de3f3d48?w=400&q=80", category: "Desserts", isVeg: true, rating: 4.8, stock: 50, unit: "piece" },
    { name: "Chocolate Lava Cake", description: "Warm chocolate cake with molten center", price: 149, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&q=80", category: "Desserts", isVeg: true, rating: 4.9, stock: 20, unit: "piece" },
    { name: "Ice Cream Sundae", description: "Vanilla ice cream with chocolate sauce and nuts", price: 129, image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80", category: "Desserts", isVeg: true, rating: 4.6, stock: 30, unit: "serving" },
    { name: "Rasmalai", description: "Soft cheese patties in sweet milk", price: 99, image: "https://images.unsplash.com/photo-1606471191009-63d2e24c422f?w=400&q=80", category: "Desserts", isVeg: true, rating: 4.7, stock: 25, unit: "piece" },

    // Beverages
    { name: "Fresh Lime Soda", description: "Refreshing lemon soda with mint", price: 59, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80", category: "Beverages", isVeg: true, rating: 4.5, stock: 100, unit: "glass" },
    { name: "Mango Lassi", description: "Sweet yogurt drink with mango pulp", price: 79, image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&q=80", category: "Beverages", isVeg: true, rating: 4.7, stock: 60, unit: "glass" },
    { name: "Masala Chai", description: "Traditional Indian spiced tea", price: 39, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=80", category: "Beverages", isVeg: true, rating: 4.6, stock: 200, unit: "glass" },
    { name: "Cold Coffee", description: "Chilled coffee with ice cream", price: 99, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80", category: "Beverages", isVeg: true, rating: 4.8, stock: 50, unit: "glass" }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for seeding...');

        // Clear existing menu items
        await MenuItem.deleteMany({});
        console.log('Cleared existing menu items.');

        // Insert all items
        const inserted = await MenuItem.insertMany(menuItems);
        console.log(`Successfully seeded ${inserted.length} menu items!`);

        const categories = [...new Set(inserted.map(item => item.category))];
        categories.forEach(cat => {
            const count = inserted.filter(item => item.category === cat).length;
            console.log(`  - ${cat}: ${count} items`);
        });

        // Create admin user if not exists
        const adminExists = await User.findOne({ email: 'admin@epiceats.com' });
        if (!adminExists) {
            await User.create({
                fullName: 'Admin',
                email: 'admin@epiceats.com',
                password: 'admin123',
                phone: '9999999999',
                role: 'admin'
            });
            console.log('\n✅ Admin user created: admin@epiceats.com / admin123');
        } else {
            console.log('\n⚠️  Admin user already exists.');
        }

        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error.message);
        process.exit(1);
    }
};

seedDB();

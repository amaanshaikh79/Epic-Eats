const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const menuItems = [
    // --- PIZZA ---
    { name: "Margherita Pizza", description: "Classic cheese pizza with rich tomato sauce and fresh basil.", price: 349, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80", category: "Pizza", isVeg: true, rating: 4.6, stock: 50, unit: "piece" },
    { name: "Farmhouse Pizza", description: "Loaded with fresh vegetables, mushrooms, peppers, and onions.", price: 449, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80", category: "Pizza", isVeg: true, rating: 4.8, stock: 40, unit: "piece" },
    { name: "Pepperoni Pizza", description: "Spicy pepperoni slices topped with premium mozzarella cheese.", price: 599, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80", category: "Pizza", isVeg: false, rating: 4.9, stock: 35, unit: "piece" },
    { name: "Chicken Tikka Pizza", description: "Tandoori chicken chunks with spicy jalapeños and red onions.", price: 549, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80", category: "Pizza", isVeg: false, rating: 4.7, stock: 30, unit: "piece" },
    { name: "Four Cheese Pizza", description: "A luxurious blend of Mozzarella, Cheddar, Parmesan, and Gouda.", price: 649, image: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500&q=80", category: "Pizza", isVeg: true, rating: 4.5, stock: 20, unit: "piece" },

    // --- BURGER ---
    { name: "Classic Aloo Tikki Burger", description: "Crispy potato patty with fresh lettuce and tangy sauce.", price: 149, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80", category: "Burger", isVeg: true, rating: 4.5, stock: 60, unit: "piece" },
    { name: "Double Cheese Burger", description: "Double beef patty with melting cheddar and caramelized onions.", price: 349, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&q=80", category: "Burger", isVeg: false, rating: 4.8, stock: 45, unit: "piece" },
    { name: "Crispy Chicken Burger", description: "Crumb-fried chicken breast with spicy mayo.", price: 299, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80", category: "Burger", isVeg: false, rating: 4.7, stock: 50, unit: "piece" },
    { name: "Mushroom Swiss Burger", description: "Sautéed mushrooms, melted Swiss cheese, and truffle mayo.", price: 279, image: "https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=500&q=80", category: "Burger", isVeg: true, rating: 4.6, stock: 30, unit: "piece" },

    // --- BIRYANI ---
    { name: "Hyderabadi Chicken Biryani", description: "Authentic dum biryani with tender chicken and aromatic spices.", price: 349, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80", category: "Biryani", isVeg: false, rating: 4.9, stock: 40, unit: "plate" },
    { name: "Mutton Dum Biryani", description: "Slow-cooked mutton with saffron rice and fried onions.", price: 499, image: "https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=500&q=80", category: "Biryani", isVeg: false, rating: 4.8, stock: 25, unit: "plate" },
    { name: "Vegetable Biryani", description: "Mixed seasonal vegetables cooked with basmati rice and mild spices.", price: 249, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500&q=80", category: "Biryani", isVeg: true, rating: 4.5, stock: 50, unit: "plate" },
    { name: "Paneer Biryani", description: "Rich and flavorful biryani featuring soft paneer cubes.", price: 299, image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&q=80", category: "Biryani", isVeg: true, rating: 4.6, stock: 35, unit: "plate" },

    // --- NORTH INDIAN ---
    { name: "Butter Chicken", description: "Creamy tomato-based curry with buttery chicken.", price: 399, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&q=80", category: "North Indian", isVeg: false, rating: 4.9, stock: 40, unit: "plate" },
    { name: "Dal Makhani", description: "Overnight slow-cooked black lentils finished with cream.", price: 279, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80", category: "North Indian", isVeg: true, rating: 4.8, stock: 50, unit: "plate" },
    { name: "Paneer Butter Masala", description: "Cottage cheese simmered in a mildly spiced tomato gravy.", price: 329, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80", category: "North Indian", isVeg: true, rating: 4.7, stock: 45, unit: "plate" },
    { name: "Garlic Naan & Mutton Rogan Josh", description: "Classic spicy Kashmiri-style mutton curry with fresh naan.", price: 549, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80", category: "North Indian", isVeg: false, rating: 4.9, stock: 20, unit: "plate" },

    // --- CHINESE ---
    { name: "Hakka Noodles", description: "Wok-tossed noodles with crunchy vegetables.", price: 199, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80", category: "Chinese", isVeg: true, rating: 4.5, stock: 60, unit: "plate" },
    { name: "Chilli Chicken Dry", description: "Spicy, sweet, and tangy crispy chicken pieces.", price: 299, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80", category: "Chinese", isVeg: false, rating: 4.7, stock: 40, unit: "plate" },
    { name: "Vegetable Manchurian", description: "Vegetable dumplings in a rich soy-garlic dark sauce.", price: 249, image: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=500&q=80", category: "Chinese", isVeg: true, rating: 4.6, stock: 50, unit: "plate" },
    { name: "Chicken Fried Rice", description: "Fluffy rice wok-tossed with egg and chicken chunks.", price: 259, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80", category: "Chinese", isVeg: false, rating: 4.8, stock: 45, unit: "plate" },
    { name: "Spring Rolls", description: "Crispy rolls filled with shredded Asian vegetables.", price: 189, image: "https://images.unsplash.com/photo-1548340748-6d2b7d7da280?w=500&q=80", category: "Chinese", isVeg: true, rating: 4.4, stock: 55, unit: "plate" },

    // --- SOUTH INDIAN ---
    { name: "Masala Dosa", description: "Crispy rice crepe filled with spiced potato mash served with chutney & sambar.", price: 169, image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500&q=80", category: "South Indian", isVeg: true, rating: 4.8, stock: 60, unit: "plate" },
    { name: "Idli Sambar", description: "Steamed rice cakes served with flavorful lentil soup.", price: 129, image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=500&q=80", category: "South Indian", isVeg: true, rating: 4.7, stock: 70, unit: "plate" },
    { name: "Medu Vada", description: "Crispy savory donut with coconut chutney.", price: 149, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", category: "South Indian", isVeg: true, rating: 4.6, stock: 50, unit: "plate" },
    { name: "Chicken Chettinad", description: "Fiery chicken curry made with roasted spices and coconut.", price: 349, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80", category: "South Indian", isVeg: false, rating: 4.8, stock: 30, unit: "plate" },

    // --- DESSERTS ---
    { name: "Chocolate Lava Cake", description: "Decadent warm chocolate cake with a gooey center.", price: 199, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=80", category: "Desserts", isVeg: true, rating: 4.9, stock: 40, unit: "piece" },
    { name: "Gulab Jamun", description: "Soft dough dumplings dipped in cardamom sugar syrup.", price: 149, image: "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500&q=80", category: "Desserts", isVeg: true, rating: 4.8, stock: 60, unit: "piece" },
    { name: "Rasmalai", description: "Cottage cheese discs soaked in sweetened saffron milk.", price: 179, image: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=500&q=80", category: "Desserts", isVeg: true, rating: 4.7, stock: 45, unit: "piece" },
    { name: "New York Cheesecake", description: "Rich and creamy baked vanilla cheesecake.", price: 299, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80", category: "Desserts", isVeg: false, rating: 4.8, stock: 25, unit: "piece" },

    // --- ROLLS ---
    { name: "Chicken Tikka Roll", description: "Spicy chicken tikka wrapped in a flaky paratha.", price: 229, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80", category: "Rolls", isVeg: false, rating: 4.7, stock: 40, unit: "piece" },
    { name: "Paneer Kathi Roll", description: "Grilled paneer and onions rolled with mint chutney.", price: 199, image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500&q=80", category: "Rolls", isVeg: true, rating: 4.6, stock: 45, unit: "piece" },
    { name: "Egg Mutton Roll", description: "Double egg wrapper loaded with spicy minced mutton.", price: 289, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80", category: "Rolls", isVeg: false, rating: 4.8, stock: 30, unit: "piece" },
    { name: "Veggie Wrap", description: "Fresh healthy vegetables and corn securely wrapped.", price: 149, image: "https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=500&q=80", category: "Rolls", isVeg: true, rating: 4.3, stock: 50, unit: "piece" }
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

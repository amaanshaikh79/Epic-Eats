const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

const path = require('path');
// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const makeAdmin = async () => {
    const email = process.argv[2];

    if (!email) {
        console.error('Please provide an email address as an argument.');
        console.log('Usage: node scripts/makeAdmin.js <user_email>');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email });

        if (!user) {
            console.error(`❌ User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();

        console.log(`🎉 Success! User ${user.email} is now an admin.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

makeAdmin();

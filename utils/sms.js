// ──────────────────────────────────────────
// Epic Eats — Twilio SMS Utility
// ──────────────────────────────────────────
const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// In-memory OTP store (in production, use Redis or DB)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP SMS for phone verification
 * @param {string} phone - Phone number with country code (e.g., +919876543210)
 * @returns {object} - { success, message }
 */
const sendOTP = async (phone) => {
    try {
        const otp = generateOTP();

        // Store OTP with 5-minute expiry
        otpStore.set(phone, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
            attempts: 0
        });

        await client.messages.create({
            body: `🍔 Epic Eats: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
            from: FROM_NUMBER,
            to: phone
        });

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Twilio SMS Error:', error.message);
        throw new Error('Failed to send OTP. Please check the phone number and try again.');
    }
};

/**
 * Verify OTP
 * @param {string} phone - Phone number
 * @param {string} otp - OTP entered by user
 * @returns {object} - { success, message }
 */
const verifyOTP = (phone, otp) => {
    const record = otpStore.get(phone);

    if (!record) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(phone);
        return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.attempts >= 3) {
        otpStore.delete(phone);
        return { success: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    record.attempts++;

    if (record.otp !== otp) {
        return { success: false, message: 'Incorrect OTP. Please try again.' };
    }

    // OTP verified successfully — clean up
    otpStore.delete(phone);
    return { success: true, message: 'Phone number verified successfully' };
};

/**
 * Send order confirmation SMS
 * @param {string} phone - Customer's phone number
 * @param {object} order - Order object
 */
const sendOrderConfirmation = async (phone, order) => {
    try {
        const itemsList = order.items
            .map(item => `${item.name} x${item.quantity}`)
            .join(', ');

        const body = `✅ Epic Eats — Order Confirmed!\n\n` +
            `Order ID: #${order._id.toString().slice(-8).toUpperCase()}\n` +
            `Items: ${itemsList}\n` +
            `Total: ₹${order.totalAmount}\n` +
            `Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online (Paid)'}\n\n` +
            `🚀 Estimated delivery: 30-45 mins.\nThank you for ordering with Epic Eats!`;

        await client.messages.create({
            body,
            from: FROM_NUMBER,
            to: phone
        });

        console.log(`📱 Order SMS sent to ${phone}`);
    } catch (error) {
        // Don't throw — SMS failure shouldn't block the order
        console.error('Order SMS failed:', error.message);
    }
};

module.exports = {
    sendOTP,
    verifyOTP,
    sendOrderConfirmation
};

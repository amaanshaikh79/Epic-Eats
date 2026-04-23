// ──────────────────────────────────────────
// Epic Eats — Email Utility (Nodemailer + Gmail)
// ──────────────────────────────────────────
const nodemailer = require('nodemailer');

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// In-memory Email OTP store (production → Redis/DB)
const emailOtpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ──── Brand Colors & Shared Styles ────
const brandStyles = `
    body { margin: 0; padding: 0; background: #fdf6ee; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #ff6b00 0%, #ff9a44 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 6px 0 0; }
    .body { padding: 36px 40px; color: #333333; }
    .body h2 { color: #1a1a1a; font-size: 22px; margin: 0 0 16px; }
    .body p { font-size: 15px; line-height: 1.7; color: #555555; margin: 0 0 14px; }
    .otp-box { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px dashed #ff6b00; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 800; color: #ff6b00; letter-spacing: 8px; margin: 0; }
    .otp-hint { font-size: 13px; color: #888; margin-top: 8px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #ff6b00, #ff9a44); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 700; font-size: 15px; margin: 20px 0; }
    .divider { height: 1px; background: #f0e6d9; margin: 24px 0; }
    .order-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .order-table th { background: #fff7ed; color: #ff6b00; padding: 10px 14px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .order-table td { padding: 12px 14px; border-bottom: 1px solid #f5efe8; font-size: 14px; color: #444; }
    .order-table .total-row td { font-weight: 700; font-size: 16px; color: #1a1a1a; border-top: 2px solid #ff6b00; border-bottom: none; }
    .address-box { background: #f9f5f0; border-radius: 10px; padding: 16px 20px; margin: 16px 0; font-size: 14px; color: #555; }
    .address-box strong { color: #333; }
    .footer { background: #1a1a1a; padding: 28px 40px; text-align: center; }
    .footer p { color: #888; font-size: 12px; margin: 0 0 4px; }
    .footer a { color: #ff9a44; text-decoration: none; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-cod { background: #fff7ed; color: #ff6b00; }
    .badge-online { background: #ecfdf5; color: #16a34a; }
    .badge-status { background: #eff6ff; color: #2563eb; }
`;

/**
 * Send Email OTP for verification
 */
const sendEmailOTP = async (email) => {
    try {
        const otp = generateOTP();

        emailOtpStore.set(email, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000,
            attempts: 0
        });

        const html = `
        <!DOCTYPE html>
        <html><head><style>${brandStyles}</style></head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <h1>🍔 EPIC EATS</h1>
                    <p>Verify Your Email Address</p>
                </div>
                <div class="body">
                    <h2>Hello there! 👋</h2>
                    <p>You're almost ready to start ordering delicious food. Use the verification code below to confirm your email address:</p>
                    <div class="otp-box">
                        <p class="otp-code">${otp}</p>
                        <p class="otp-hint">This code expires in 5 minutes</p>
                    </div>
                    <p>If you didn't request this code, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
                    <p>Delivering delicious food from the best restaurants 🚀</p>
                </div>
            </div>
        </body></html>`;

        await transporter.sendMail({
            from: `"Epic Eats" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: '🔐 Epic Eats — Verify Your Email',
            html
        });

        return { success: true, message: 'Verification code sent to your email' };
    } catch (error) {
        console.error('Email OTP Error:', error.message);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

/**
 * Verify Email OTP
 */
const verifyEmailOTP = (email, otp) => {
    const record = emailOtpStore.get(email);

    if (!record) {
        return { success: false, message: 'No verification code found. Please request a new one.' };
    }

    if (Date.now() > record.expiresAt) {
        emailOtpStore.delete(email);
        return { success: false, message: 'Code has expired. Please request a new one.' };
    }

    if (record.attempts >= 3) {
        emailOtpStore.delete(email);
        return { success: false, message: 'Too many attempts. Please request a new code.' };
    }

    record.attempts++;

    if (record.otp !== otp) {
        return { success: false, message: 'Incorrect code. Please try again.' };
    }

    emailOtpStore.delete(email);
    return { success: true, message: 'Email verified successfully' };
};

/**
 * Send Welcome Email after registration
 */
const sendWelcomeEmail = async (user) => {
    try {
        const html = `
        <!DOCTYPE html>
        <html><head><style>${brandStyles}</style></head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <h1>🍔 EPIC EATS</h1>
                    <p>Welcome aboard!</p>
                </div>
                <div class="body">
                    <h2>Hey ${user.fullName}! 🎉</h2>
                    <p>Welcome to <strong>Epic Eats</strong> — your new favourite food delivery companion! We're thrilled to have you with us.</p>
                    <p>Here's what you can do right away:</p>
                    <ul style="color: #555; font-size: 15px; line-height: 2;">
                        <li>🍕 Browse our menu with 50+ mouth-watering dishes</li>
                        <li>🛒 Add items to cart and checkout in seconds</li>
                        <li>💳 Pay securely via Razorpay or Cash on Delivery</li>
                        <li>📦 Track your orders in real-time</li>
                    </ul>
                    <div class="divider"></div>
                    <p style="text-align: center;">
                        <a href="http://localhost:3000/menu" class="btn">🍽️ Browse Menu</a>
                    </p>
                    <div class="divider"></div>
                    <p style="font-size: 13px; color: #999;">Your account details:<br/>
                    <strong>Name:</strong> ${user.fullName}<br/>
                    <strong>Email:</strong> ${user.email}<br/>
                    <strong>Phone:</strong> ${user.phone || 'Not added yet'}</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
                    <p>Made with ❤️ for food lovers</p>
                </div>
            </div>
        </body></html>`;

        await transporter.sendMail({
            from: `"Epic Eats" <${process.env.SMTP_EMAIL}>`,
            to: user.email,
            subject: '🎉 Welcome to Epic Eats — Let\'s get you fed!',
            html
        });

        console.log(`📧 Welcome email sent to ${user.email}`);
    } catch (error) {
        console.error('Welcome email failed:', error.message);
    }
};

/**
 * Send Order Confirmation Email
 */
const sendOrderEmail = async (email, order) => {
    try {
        const itemRows = order.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.price}</td>
                <td style="text-align: right;">₹${item.price * item.quantity}</td>
            </tr>
        `).join('');

        const paymentBadge = order.paymentMethod === 'cod'
            ? '<span class="badge badge-cod">💵 Cash on Delivery</span>'
            : '<span class="badge badge-online">💳 Paid Online</span>';

        const addr = order.deliveryAddress;
        const addressStr = addr
            ? `${addr.street}, ${addr.city}, ${addr.state} — ${addr.pinCode}<br/>📞 ${addr.phone}`
            : 'N/A';

        const html = `
        <!DOCTYPE html>
        <html><head><style>${brandStyles}</style></head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <h1>🍔 EPIC EATS</h1>
                    <p>Order Confirmation</p>
                </div>
                <div class="body">
                    <h2>Order Placed Successfully! ✅</h2>
                    <p>Thank you for your order. Here's your order summary:</p>

                    <table style="width: 100%; margin: 16px 0; font-size: 14px;">
                        <tr>
                            <td style="color: #888;">Order ID</td>
                            <td style="text-align: right; font-weight: 700; color: #ff6b00;">#${order._id.toString().slice(-8).toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #888;">Status</td>
                            <td style="text-align: right;"><span class="badge badge-status">🚀 ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
                        </tr>
                        <tr>
                            <td style="color: #888;">Payment</td>
                            <td style="text-align: right;">${paymentBadge}</td>
                        </tr>
                        <tr>
                            <td style="color: #888;">Estimated Delivery</td>
                            <td style="text-align: right; font-weight: 600;">30-45 minutes</td>
                        </tr>
                    </table>

                    <div class="divider"></div>

                    <h3 style="font-size: 16px; color: #1a1a1a; margin-bottom: 8px;">🧾 Order Items</h3>
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows}
                            <tr>
                                <td colspan="3" style="text-align: right; color: #888;">Delivery Fee</td>
                                <td style="text-align: right;">${order.deliveryFee ? '₹' + order.deliveryFee : '<span style="color:#16a34a;font-weight:600;">FREE</span>'}</td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="3" style="text-align: right;">Grand Total</td>
                                <td style="text-align: right; color: #ff6b00;">₹${order.totalAmount}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3 style="font-size: 16px; color: #1a1a1a; margin: 24px 0 8px;">📍 Delivery Address</h3>
                    <div class="address-box">
                        ${addressStr}
                    </div>

                    <div class="divider"></div>
                    <p style="text-align: center; color: #888; font-size: 13px;">Need help? Reply to this email or contact us at <a href="mailto:supportepiceats@gmail.com" style="color: #ff6b00;">supportepiceats@gmail.com</a></p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
                    <p>Delivering happiness, one meal at a time 🚀</p>
                </div>
            </div>
        </body></html>`;

        await transporter.sendMail({
            from: `"Epic Eats" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: `✅ Epic Eats — Order #${order._id.toString().slice(-8).toUpperCase()} Confirmed!`,
            html
        });

        console.log(`📧 Order email sent to ${email}`);
    } catch (error) {
        console.error('Order email failed:', error.message);
    }
};

/**
 * Send Tracking Link Email to Customer when delivery partner is assigned
 */
const sendTrackingEmail = async (email, order, partner, trackingLink) => {
    try {
        const itemsList = order.items.map(item =>
            `<tr>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.price * item.quantity}</td>
            </tr>`
        ).join('');

        const addr = order.deliveryAddress;
        const addressStr = addr
            ? `${addr.street}, ${addr.city}, ${addr.state} — ${addr.pinCode}`
            : 'N/A';

        const html = `
        <!DOCTYPE html>
        <html><head><style>${brandStyles}</style></head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <h1>🍔 EPIC EATS</h1>
                    <p>Your Order is On Its Way! 🚀</p>
                </div>
                <div class="body">
                    <h2>Great News! 🎉</h2>
                    <p>Your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has been assigned to a delivery partner and is on its way!</p>

                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 14px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 12px; color: #166534; font-size: 15px;">🏍️ Your Delivery Partner</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="color: #888; padding: 4px 0;">Name</td>
                                <td style="text-align: right; font-weight: 600; color: #1a1a1a;">${partner.name}</td>
                            </tr>
                            <tr>
                                <td style="color: #888; padding: 4px 0;">Phone</td>
                                <td style="text-align: right; font-weight: 600; color: #1a1a1a;">📞 ${partner.phone}</td>
                            </tr>
                            <tr>
                                <td style="color: #888; padding: 4px 0;">Vehicle</td>
                                <td style="text-align: right; font-weight: 600; color: #1a1a1a;">${partner.vehicleType.charAt(0).toUpperCase() + partner.vehicleType.slice(1)} ${partner.vehicleNumber ? '(' + partner.vehicleNumber + ')' : ''}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="font-size: 16px; color: #1a1a1a; margin-bottom: 8px;">🧾 Order Summary</h3>
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList}
                            <tr class="total-row">
                                <td colspan="2" style="text-align: right;">Grand Total</td>
                                <td style="text-align: right; color: #ff6b00;">₹${order.totalAmount}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3 style="font-size: 16px; color: #1a1a1a; margin: 24px 0 8px;">📍 Delivering To</h3>
                    <div class="address-box">${addressStr}</div>

                    <div class="divider"></div>

                    <div style="text-align: center; margin: 24px 0;">
                        <p style="font-size: 15px; color: #555; margin-bottom: 12px;">Track your delivery in real-time:</p>
                        <a href="${trackingLink}" class="btn" style="font-size: 16px; padding: 16px 40px;">📍 Track My Order Live</a>
                    </div>

                    <div class="divider"></div>
                    <p style="text-align: center; color: #888; font-size: 13px;">Need help? Reply to this email or contact us at <a href="mailto:supportepiceats@gmail.com" style="color: #ff6b00;">supportepiceats@gmail.com</a></p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
                    <p>Delivering happiness, one meal at a time 🚀</p>
                </div>
            </div>
        </body></html>`;

        await transporter.sendMail({
            from: `"Epic Eats" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: `🚀 Epic Eats — Your Order #${order._id.toString().slice(-8).toUpperCase()} is On the Way!`,
            html
        });

        console.log(`📧 Tracking email sent to ${email}`);
    } catch (error) {
        console.error('Tracking email failed:', error.message);
    }
};

/**
 * Send Delivery Assignment Email to Delivery Partner
 */
const sendDeliveryAssignmentEmail = async (partner, order) => {
    try {
        const itemsList = order.items.map(item =>
            `<tr>
                <td>${item.name}</td>
                <td style="text-align: center;">×${item.quantity}</td>
            </tr>`
        ).join('');

        const addr = order.deliveryAddress;
        const addressStr = addr
            ? `${addr.street}, ${addr.city}, ${addr.state} — ${addr.pinCode}<br/>📞 ${addr.phone}`
            : 'N/A';

        const customerName = order.user?.fullName || 'Customer';
        const customerPhone = order.deliveryAddress?.phone || 'N/A';

        const html = `
        <!DOCTYPE html>
        <html><head><style>${brandStyles}</style></head>
        <body>
            <div class="email-wrapper">
                <div class="header" style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);">
                    <h1>🏍️ EPIC EATS — DELIVERY</h1>
                    <p>New Order Assignment</p>
                </div>
                <div class="body">
                    <h2>Hey ${partner.name}! 👋</h2>
                    <p>You have been assigned a new delivery order. Please pick it up as soon as possible.</p>

                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 14px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 12px; color: #92400e; font-size: 15px;">📋 Order Details</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="color: #92400e; padding: 4px 0;">Order ID</td>
                                <td style="text-align: right; font-weight: 700; color: #1a1a1a;">#${order._id.toString().slice(-8).toUpperCase()}</td>
                            </tr>
                            <tr>
                                <td style="color: #92400e; padding: 4px 0;">Total Amount</td>
                                <td style="text-align: right; font-weight: 700; color: #ff6b00;">₹${order.totalAmount}</td>
                            </tr>
                            <tr>
                                <td style="color: #92400e; padding: 4px 0;">Payment</td>
                                <td style="text-align: right; font-weight: 600;">${order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Paid Online'}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="font-size: 16px; color: #1a1a1a; margin-bottom: 8px;">🧾 Items to Pick Up</h3>
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: center;">Qty</th>
                            </tr>
                        </thead>
                        <tbody>${itemsList}</tbody>
                    </table>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
                        <div style="background: #eff6ff; border-radius: 12px; padding: 16px;">
                            <h4 style="font-size: 13px; color: #1d4ed8; margin-bottom: 8px;">🏪 PICKUP</h4>
                            <p style="font-size: 14px; color: #333; margin: 0;">Epic Eats Kitchen<br/>Main Branch</p>
                        </div>
                        <div style="background: #fef2f2; border-radius: 12px; padding: 16px;">
                            <h4 style="font-size: 13px; color: #dc2626; margin-bottom: 8px;">📍 DROP</h4>
                            <p style="font-size: 14px; color: #333; margin: 0;">${addressStr}</p>
                        </div>
                    </div>

                    <div class="address-box">
                        <strong>👤 Customer:</strong> ${customerName}<br/>
                        <strong>📞 Contact:</strong> ${customerPhone}
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <p style="font-size: 15px; color: #555; margin-bottom: 12px;">Start your delivery and share your live location:</p>
                        <a href="${process.env.FRONTEND_URL}/delivery/share-location/${partner._id}" class="btn" style="background: linear-gradient(135deg, #FC8019 0%, #ff6b00 100%); font-size: 16px; padding: 16px 40px; display: inline-block;">▶ Start Sharing Location</a>
                    </div>

                    <div class="divider"></div>
                    <p style="text-align: center; color: #888; font-size: 13px;">Please ensure timely delivery. Contact support if needed.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Epic Eats Delivery Team</p>
                    <p>🏍️ Ride safe, deliver with a smile!</p>
                </div>
            </div>
        </body></html>`;

        await transporter.sendMail({
            from: `"Epic Eats Delivery" <${process.env.SMTP_EMAIL}>`,
            to: partner.email,
            subject: `🏍️ New Delivery Assignment — Order #${order._id.toString().slice(-8).toUpperCase()}`,
            html
        });

        console.log(`📧 Delivery assignment email sent to ${partner.email}`);
    } catch (error) {
        console.error('Delivery assignment email failed:', error.message);
    }
};

module.exports = {
    sendEmailOTP,
    verifyEmailOTP,
    sendWelcomeEmail,
    sendOrderEmail,
    sendTrackingEmail,
    sendDeliveryAssignmentEmail
};

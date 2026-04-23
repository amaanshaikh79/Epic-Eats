/**
 * Delivery Assignment Service
 * 
 * Handles: nearest-partner assignment (Haversine), retry logic,
 * partner timeout/offline detection, and auto-reassignment.
 */

const Order = require('../models/Order');
const DeliveryPartner = require('../models/DeliveryPartner');
const User = require('../models/User');
const crypto = require('crypto');
const { haversineDistance, isValidCoordinate } = require('./geo');
const { sendTrackingEmail, sendDeliveryAssignmentEmail } = require('./email');

const MAX_RETRIES = 10;
const RETRY_INTERVAL_MS = 30 * 1000;       // 30 seconds between retries
const PARTNER_ACCEPT_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes to start sharing location
const PARTNER_STALE_MS = 3 * 60 * 1000;    // 3 minutes without location = stale

// In-memory retry timers (keyed by orderId string)
const retryTimers = new Map();

/**
 * Geocode an address string using OpenStreetMap Nominatim.
 * Returns { lat, lng } or null.
 */
const geocodeAddress = async (address) => {
    try {
        const addrStr = `${address.street}, ${address.city}, ${address.state} ${address.pinCode}`;
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrStr)}&limit=1`,
            { headers: { 'User-Agent': 'EpicEats/1.0' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        // Fallback: try city only
        const cityRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.city + ' ' + address.state)}&limit=1`,
            { headers: { 'User-Agent': 'EpicEats/1.0' } }
        );
        const cityData = await cityRes.json();
        if (cityData && cityData.length > 0) {
            return { lat: parseFloat(cityData[0].lat), lng: parseFloat(cityData[0].lon) };
        }
    } catch (err) {
        console.error('Geocoding failed:', err.message);
    }
    return null;
};

/**
 * Find the nearest available delivery partner to a given location.
 * Uses Haversine formula for distance calculation.
 */
const findNearestPartner = async (targetLat, targetLng) => {
    const partners = await DeliveryPartner.find({
        isAvailable: true,
        isActive: true
    });

    if (partners.length === 0) return null;

    // Separate partners with valid coordinates from those without
    const withCoords = [];
    const withoutCoords = [];

    for (const p of partners) {
        if (isValidCoordinate(p.currentLocation.lat, p.currentLocation.lng)) {
            const dist = haversineDistance(
                targetLat, targetLng,
                p.currentLocation.lat, p.currentLocation.lng
            );
            withCoords.push({ partner: p, distance: dist });
        } else {
            withoutCoords.push(p);
        }
    }

    // Sort by distance (nearest first)
    withCoords.sort((a, b) => a.distance - b.distance);

    if (withCoords.length > 0) {
        console.log(`📍 Nearest partner: ${withCoords[0].partner.name} (${withCoords[0].distance.toFixed(2)} km)`);
        return withCoords[0].partner;
    }

    // If no partners have valid coords, pick the one with highest rating
    if (withoutCoords.length > 0) {
        withoutCoords.sort((a, b) => b.rating - a.rating);
        console.log(`📍 No geolocated partners, assigning by rating: ${withoutCoords[0].name}`);
        return withoutCoords[0];
    }

    return null;
};

/**
 * Build frontend URL for tracking links
 */
const buildFrontendUrl = (req) => {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
    if (req) {
        const origin = req.get('origin');
        if (origin) return origin;
        const protocol = req.protocol;
        const host = req.get('host');
        return `${protocol}://${host.replace(':5000', ':3000')}`;
    }
    return 'http://localhost:3000';
};

/**
 * Core assignment logic — assigns nearest partner to an order.
 * Returns { success, message, partner? }
 */
const assignPartnerToOrder = async (orderId, io, req) => {
    const order = await Order.findById(orderId).populate('user', 'fullName email phone');
    if (!order) return { success: false, message: 'Order not found' };
    if (order.deliveryPartner) return { success: false, message: 'Order already assigned' };
    if (['delivered', 'cancelled'].includes(order.status)) {
        return { success: false, message: 'Order is already completed/cancelled' };
    }

    // Geocode delivery address for distance calculation
    let targetLat, targetLng;
    const geo = await geocodeAddress(order.deliveryAddress);
    if (geo) {
        targetLat = geo.lat;
        targetLng = geo.lng;
    } else {
        // Can't geocode — fallback: assign by rating
        targetLat = null;
        targetLng = null;
    }

    // Find nearest partner
    let partner;
    if (targetLat !== null && targetLng !== null) {
        partner = await findNearestPartner(targetLat, targetLng);
    } else {
        // No geocode — just find any available partner sorted by rating
        partner = await DeliveryPartner.findOne({
            isAvailable: true,
            isActive: true
        }).sort({ rating: -1 });
    }

    if (!partner) {
        // No partner available — schedule retry
        order.assignmentRetries = (order.assignmentRetries || 0) + 1;
        order.lastRetryAt = new Date();
        await order.save();

        console.log(`⚠️ No partner available for order ${orderId}. Retry ${order.assignmentRetries}/${MAX_RETRIES}`);

        // Emit to frontend
        if (io) {
            io.emit(`order-${orderId}`, {
                type: 'assignment_failed',
                message: 'No delivery partner available. Retrying...',
                retries: order.assignmentRetries,
                maxRetries: MAX_RETRIES
            });
        }

        if (order.assignmentRetries < MAX_RETRIES) {
            scheduleRetry(orderId, io, req);
        } else {
            if (io) {
                io.emit(`order-${orderId}`, {
                    type: 'assignment_exhausted',
                    message: 'No delivery partners available after multiple attempts. Admin will assign manually.'
                });
            }
        }

        return { success: false, message: 'No delivery partner available' };
    }

    // Generate tracking token
    const trackingToken = crypto.randomBytes(16).toString('hex');

    // Assign partner
    order.deliveryPartner = partner._id;
    order.trackingToken = trackingToken;
    order.status = 'assigned';
    order.assignedAt = new Date();
    await order.save();

    // Mark partner as unavailable and link order
    partner.isAvailable = false;
    partner.currentOrder = order._id;
    await partner.save();

    const frontendUrl = buildFrontendUrl(req);
    const trackingLink = `${frontendUrl}/track/${order._id}/${trackingToken}`;

    // Send notification emails (non-blocking)
    if (order.user?.email) {
        sendTrackingEmail(order.user.email, order, partner, trackingLink).catch(e =>
            console.error('Tracking email failed:', e.message)
        );
    }
    if (partner.email) {
        sendDeliveryAssignmentEmail(partner, order).catch(e =>
            console.error('Assignment email failed:', e.message)
        );
    }

    // Emit real-time update to all listening clients
    if (io) {
        io.emit(`order-${orderId}`, {
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

    // Clear any pending retry timer
    clearRetryTimer(orderId);

    // Schedule partner acceptance timeout check
    scheduleAcceptanceTimeout(orderId, partner._id, io, req);

    console.log(`✅ Partner ${partner.name} assigned to order ${orderId} (tracking: ${trackingLink})`);
    return { success: true, message: `Partner ${partner.name} assigned`, partner, trackingLink };
};

/**
 * Schedule a retry for assignment
 */
const scheduleRetry = (orderId, io, req) => {
    clearRetryTimer(orderId);
    const timer = setTimeout(async () => {
        retryTimers.delete(orderId.toString());
        try {
            await assignPartnerToOrder(orderId, io, req);
        } catch (err) {
            console.error(`Retry assignment failed for ${orderId}:`, err.message);
        }
    }, RETRY_INTERVAL_MS);
    retryTimers.set(orderId.toString(), timer);
};

/**
 * Clear any pending retry timer
 */
const clearRetryTimer = (orderId) => {
    const key = orderId.toString();
    if (retryTimers.has(key)) {
        clearTimeout(retryTimers.get(key));
        retryTimers.delete(key);
    }
};

/**
 * Schedule check: if partner hasn't started sharing location within timeout, reassign.
 */
const scheduleAcceptanceTimeout = (orderId, partnerId, io, req) => {
    setTimeout(async () => {
        try {
            const order = await Order.findById(orderId);
            if (!order || order.status !== 'assigned') return; // already progressed or cancelled

            const partner = await DeliveryPartner.findById(partnerId);
            if (!partner) return;

            // Check if partner has sent any location update since assignment
            const assignedAt = order.assignedAt || order.updatedAt;
            if (!partner.lastLocationAt || partner.lastLocationAt < assignedAt) {
                console.log(`⏰ Partner ${partner.name} didn't accept order ${orderId}. Reassigning...`);

                // Free the partner
                partner.isAvailable = true;
                partner.currentOrder = null;
                await partner.save();

                // Unassign from order
                order.deliveryPartner = null;
                order.trackingToken = '';
                order.status = 'confirmed';
                order.assignedAt = null;
                await order.save();

                if (io) {
                    io.emit(`order-${orderId}`, {
                        type: 'partner_timeout',
                        message: 'Delivery partner did not respond. Reassigning...'
                    });
                }

                // Try to assign a different partner
                await assignPartnerToOrder(orderId, io, req);
            }
        } catch (err) {
            console.error(`Acceptance timeout check failed:`, err.message);
        }
    }, PARTNER_ACCEPT_TIMEOUT_MS);
};

/**
 * Check for stale partners (no location update in PARTNER_STALE_MS) and reassign.
 * Should be called periodically (e.g. every 60s from server.js).
 */
const checkStalePartners = async (io) => {
    try {
        const staleThreshold = new Date(Date.now() - PARTNER_STALE_MS);

        // Find orders that are out_for_delivery with partners that haven't updated location
        const activeOrders = await Order.find({
            status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] },
            deliveryPartner: { $ne: null }
        }).populate('deliveryPartner');

        for (const order of activeOrders) {
            const partner = order.deliveryPartner;
            if (!partner) continue;

            // If partner hasn't sent location in PARTNER_STALE_MS
            if (partner.lastLocationAt && partner.lastLocationAt < staleThreshold) {
                console.log(`📴 Partner ${partner.name} appears offline for order ${order._id}. Flagging...`);

                if (io) {
                    io.emit(`order-${order._id}`, {
                        type: 'partner_offline',
                        message: 'Delivery partner appears to be offline. Monitoring...'
                    });
                }
            }
        }
    } catch (err) {
        console.error('Stale partner check failed:', err.message);
    }
};

/**
 * Free a partner after order completion (delivered/cancelled).
 */
const freePartner = async (orderId, io) => {
    try {
        const order = await Order.findById(orderId).populate('deliveryPartner');
        if (!order || !order.deliveryPartner) return;

        const partner = order.deliveryPartner;
        partner.isAvailable = true;
        partner.currentOrder = null;

        if (order.status === 'delivered') {
            partner.totalDeliveries = (partner.totalDeliveries || 0) + 1;
        }

        await partner.save();
        console.log(`🟢 Partner ${partner.name} is now available again`);
    } catch (err) {
        console.error('Free partner failed:', err.message);
    }
};

module.exports = {
    assignPartnerToOrder,
    scheduleRetry,
    clearRetryTimer,
    checkStalePartners,
    freePartner,
    geocodeAddress,
    findNearestPartner,
    buildFrontendUrl,
    MAX_RETRIES
};

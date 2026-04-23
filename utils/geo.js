/**
 * Haversine formula — calculates distance between two lat/lng points in km.
 * Used for nearest-partner assignment.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
};

/**
 * Validate that coordinates are real and not null-island (0,0)
 */
const isValidCoordinate = (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === null || lng === null) return false;
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    // Reject null-island (0,0) — no real delivery happens there
    if (lat === 0 && lng === 0) return false;
    return true;
};

/**
 * Check if a location update is suspiciously fast (teleportation detection).
 * Max speed ~120 km/h for a delivery vehicle.
 */
const isMovementConsistent = (prevLat, prevLng, prevTime, newLat, newLng, newTime) => {
    if (!prevTime || !isValidCoordinate(prevLat, prevLng)) return true; // first update, allow

    const distance = haversineDistance(prevLat, prevLng, newLat, newLng);
    const timeDiffHours = (newTime - prevTime) / (1000 * 60 * 60);

    if (timeDiffHours <= 0) return true; // same timestamp
    const speed = distance / timeDiffHours; // km/h

    return speed <= 150; // allow up to 150 km/h (highways + GPS jitter margin)
};

module.exports = {
    haversineDistance,
    isValidCoordinate,
    isMovementConsistent
};

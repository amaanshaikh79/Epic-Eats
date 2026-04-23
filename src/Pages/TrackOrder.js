import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import { getTracking } from "../utils/api.js"
import { io } from "socket.io-client"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "../css/TrackOrder.css"

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

const bikeIcon = L.divIcon({
    html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🏍️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: "delivery-icon"
})

const dropIcon = L.divIcon({
    html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    className: "delivery-icon"
})

const statusSteps = [
    { key: "confirmed", label: "Confirmed", icon: "✅" },
    { key: "assigned", label: "Partner Assigned", icon: "🤝" },
    { key: "picked_up", label: "Picked Up", icon: "📦" },
    { key: "out_for_delivery", label: "On the Way", icon: "🏍️" },
    { key: "delivered", label: "Delivered", icon: "🎉" },
]

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || "http://localhost:5000"

const TrackOrder = () => {
    const { orderId, token } = useParams()
    const [tracking, setTracking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [assignmentMsg, setAssignmentMsg] = useState("")
    const [lastUpdated, setLastUpdated] = useState(null)
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markerRef = useRef(null)
    const dropMarkerRef = useRef(null)
    const socketRef = useRef(null)
    const [dropLocation, setDropLocation] = useState(null)

    // Initial fetch
    const fetchTrackingCb = useCallback(async () => {
        try {
            const data = await getTracking(orderId, token)
            setTracking(data.tracking)
            setError("")
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [orderId, token])

    useEffect(() => {
        fetchTrackingCb()
    }, [fetchTrackingCb])

    // Socket.IO for real-time updates (replaces HTTP polling)
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] })
        socketRef.current = socket

        socket.on("connect", () => {
            console.log("📡 Connected to tracking socket")
            socket.emit("join-tracking", orderId)
        })

        // Listen for location updates from delivery partner
        socket.on(`order-${orderId}`, (data) => {
            if (data.type === "location_update") {
                const { lat, lng, updatedAt } = data
                setLastUpdated(updatedAt)
                // Update marker position smoothly
                if (markerRef.current && lat && lng) {
                    markerRef.current.setLatLng([lat, lng])
                    // Pan map to follow
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 1 })
                    }
                }
                // Update tracking state
                setTracking(prev => prev ? {
                    ...prev,
                    deliveryPartner: prev.deliveryPartner ? {
                        ...prev.deliveryPartner,
                        currentLocation: { lat, lng, updatedAt }
                    } : prev.deliveryPartner
                } : prev)
            }
            if (data.type === "status_update") {
                setTracking(prev => prev ? { ...prev, status: data.status } : prev)
                if (data.partner) {
                    setTracking(prev => prev ? {
                        ...prev,
                        deliveryPartner: { ...prev?.deliveryPartner, ...data.partner }
                    } : prev)
                }
                setAssignmentMsg("")
            }
            if (data.type === "assignment_failed") {
                setAssignmentMsg(data.message)
            }
            if (data.type === "assignment_exhausted") {
                setAssignmentMsg(data.message)
            }
            if (data.type === "partner_timeout") {
                setAssignmentMsg(data.message)
            }
            if (data.type === "partner_offline") {
                setAssignmentMsg(data.message)
            }
        })

        // Also listen on partner-specific location channel
        socket.onAny((event, data) => {
            if (event.startsWith("location-") && data.lat && data.lng) {
                setLastUpdated(data.updatedAt)
                if (markerRef.current) {
                    markerRef.current.setLatLng([data.lat, data.lng])
                }
            }
        })

        return () => {
            socket.disconnect()
        }
    }, [orderId])

    // Geocode delivery address
    useEffect(() => {
        if (tracking && tracking.deliveryAddress && !dropLocation) {
            const geocode = async () => {
                try {
                    const addrStr = `${tracking.deliveryAddress.street}, ${tracking.deliveryAddress.city}, ${tracking.deliveryAddress.state} ${tracking.deliveryAddress.pinCode}`
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrStr)}&limit=1`)
                    const geodata = await res.json()
                    if (geodata && geodata.length > 0) {
                        setDropLocation({ lat: parseFloat(geodata[0].lat), lng: parseFloat(geodata[0].lon) })
                    } else {
                        const resCity = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tracking.deliveryAddress.city + ' ' + tracking.deliveryAddress.state)}&limit=1`)
                        const cityData = await resCity.json()
                        if (cityData && cityData.length > 0) {
                            setDropLocation({ lat: parseFloat(cityData[0].lat), lng: parseFloat(cityData[0].lon) })
                        }
                    }
                } catch (e) {
                    console.error("Geocoding failed", e)
                }
            }
            geocode()
        }
    }, [tracking, dropLocation])

    // Initialize map
    useEffect(() => {
        if (!tracking || mapInstanceRef.current) return
        if (!mapRef.current) return
        if (tracking.deliveryAddress && !dropLocation) return

        const partner = tracking.deliveryPartner
        const addr = tracking.deliveryAddress

        let centerLat = dropLocation ? dropLocation.lat : null
        let centerLng = dropLocation ? dropLocation.lng : null

        if (partner?.currentLocation?.lat && partner?.currentLocation?.lng &&
            !(partner.currentLocation.lat === 0 && partner.currentLocation.lng === 0)) {
            centerLat = partner.currentLocation.lat
            centerLng = partner.currentLocation.lng
        }

        if (!centerLat || !centerLng) return // Don't init map with no valid coords

        const map = L.map(mapRef.current, {
            center: [centerLat, centerLng],
            zoom: 14,
            zoomControl: true,
            scrollWheelZoom: true,
        })

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map)

        // Delivery partner marker (only if real coordinates)
        if (partner?.currentLocation?.lat && partner?.currentLocation?.lng &&
            !(partner.currentLocation.lat === 0 && partner.currentLocation.lng === 0)) {
            markerRef.current = L.marker(
                [partner.currentLocation.lat, partner.currentLocation.lng],
                { icon: bikeIcon }
            ).addTo(map).bindPopup(`<b>🏍️ ${partner.name}</b><br/>Your delivery partner`)
        }

        // Drop location marker
        if (dropLocation && addr) {
            dropMarkerRef.current = L.marker(
                [dropLocation.lat, dropLocation.lng],
                { icon: dropIcon }
            ).addTo(map).bindPopup(`<b>📍 Drop Location</b><br/>${addr.street}, ${addr.city}`)
        }

        // Fit bounds to show both markers
        if (markerRef.current && dropMarkerRef.current) {
            const group = L.featureGroup([markerRef.current, dropMarkerRef.current])
            map.fitBounds(group.getBounds().pad(0.3))
        }

        mapInstanceRef.current = map

        return () => { }
    }, [tracking, dropLocation])

    const getActiveStep = () => {
        if (!tracking) return -1
        const idx = statusSteps.findIndex(s => s.key === tracking.status)
        if (tracking.status === "shipped") return 3
        if (tracking.status === "preparing") return 0
        if (tracking.status === "delivered") return statusSteps.length - 1
        return idx
    }

    if (loading) return (
        <div className="track-page">
            <div className="track-loading">
                <div className="track-loading-spinner"></div>
                <p>Loading tracking information...</p>
            </div>
        </div>
    )

    if (error) return (
        <div className="track-page">
            <div className="track-error">
                <span className="track-error-icon">⚠️</span>
                <h2>Tracking Unavailable</h2>
                <p>{error}</p>
            </div>
        </div>
    )

    if (!tracking) return null

    const activeStep = getActiveStep()

    return (
        <div className="track-page">
            {/* Hero Section */}
            <div className="track-hero">
                <div className="track-hero-content">
                    <h1>📍 Live Order Tracking</h1>
                    <p>Order #{tracking.orderId?.slice(-8).toUpperCase()}</p>
                </div>
            </div>

            <div className="track-container">
                {/* Assignment Messages */}
                {assignmentMsg && (
                    <div className="track-assignment-msg">
                        <div className="assignment-spinner"></div>
                        <span>{assignmentMsg}</span>
                    </div>
                )}

                {/* Status Timeline */}
                <div className="track-timeline-card">
                    <h3>Order Progress</h3>
                    <div className="track-timeline">
                        {statusSteps.map((step, idx) => (
                            <div
                                key={step.key}
                                className={`timeline-step ${idx <= activeStep ? "active" : ""} ${idx === activeStep ? "current" : ""}`}
                            >
                                <div className="timeline-icon">{step.icon}</div>
                                <span className="timeline-label">{step.label}</span>
                                {idx < statusSteps.length - 1 && (
                                    <div className={`timeline-line ${idx < activeStep ? "filled" : ""}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="track-grid">
                    {/* Map */}
                    <div className="track-map-card">
                        <h3>🗺️ Live Location</h3>
                        <div className="track-map-wrapper" ref={mapRef} id="tracking-map"></div>
                        {(lastUpdated || tracking.deliveryPartner?.currentLocation?.updatedAt) && (
                            <p className="map-updated">
                                Last updated: {new Date(lastUpdated || tracking.deliveryPartner.currentLocation.updatedAt).toLocaleTimeString('en-IN')}
                            </p>
                        )}
                        {!tracking.deliveryPartner && (
                            <p className="map-updated" style={{ color: "#f59e0b" }}>
                                Waiting for delivery partner assignment...
                            </p>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="track-details-panel">
                        {/* Delivery Partner Info */}
                        {tracking.deliveryPartner && (
                            <div className="track-partner-card">
                                <h3>🏍️ Delivery Partner</h3>
                                <div className="partner-info">
                                    <div className="partner-avatar">
                                        {tracking.deliveryPartner.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="partner-details">
                                        <span className="partner-name">{tracking.deliveryPartner.name}</span>
                                        <span className="partner-vehicle">
                                            {tracking.deliveryPartner.vehicleType?.charAt(0).toUpperCase() + tracking.deliveryPartner.vehicleType?.slice(1)}
                                            {tracking.deliveryPartner.vehicleNumber && ` • ${tracking.deliveryPartner.vehicleNumber}`}
                                        </span>
                                    </div>
                                    <a href={`tel:${tracking.deliveryPartner.phone}`} className="partner-call-btn">
                                        📞 Call
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Order Summary */}
                        <div className="track-summary-card">
                            <h3>🧾 Order Summary</h3>
                            <div className="track-items">
                                {tracking.items?.map((item, idx) => (
                                    <div key={idx} className="track-item">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="track-total">
                                <span>Total</span>
                                <span>₹{tracking.totalAmount}</span>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        {tracking.deliveryAddress && (
                            <div className="track-address-card">
                                <h3>📍 Delivering To</h3>
                                <p>
                                    {tracking.deliveryAddress.street}, {tracking.deliveryAddress.city},{" "}
                                    {tracking.deliveryAddress.state} - {tracking.deliveryAddress.pinCode}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TrackOrder

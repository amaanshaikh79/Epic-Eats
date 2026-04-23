import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import { updateDeliveryLocation } from "../utils/api.js"
import "../css/ShareLocation.css"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

const ShareLocation = () => {
    const { partnerId } = useParams()
    const [status, setStatus] = useState("idle") // idle, tracking, error
    const [errorMsg, setErrorMsg] = useState("")
    const [location, setLocation] = useState(null)
    const [updateCount, setUpdateCount] = useState(0)
    const [order, setOrder] = useState(null)
    const [orderLoading, setOrderLoading] = useState(true)
    const [statusUpdating, setStatusUpdating] = useState(false)
    const watchIdRef = useRef(null)

    // Fetch current assigned order for this partner
    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/delivery/partner/${partnerId}/order`)
            const data = await res.json()
            if (data.success) {
                setOrder(data.order)
            }
        } catch (err) {
            console.error("Failed to fetch order:", err)
        } finally {
            setOrderLoading(false)
        }
    }, [partnerId])

    useEffect(() => {
        fetchOrder()
    }, [fetchOrder])

    const updateLocationOnServer = async (lat, lng) => {
        try {
            await updateDeliveryLocation(partnerId, lat, lng)
            setUpdateCount(c => c + 1)
        } catch (err) {
            console.error("Server error", err)
            if (err.message.includes("rejected")) {
                setErrorMsg("Location update rejected by server. Possible GPS issue.")
            }
        }
    }

    const startTracking = () => {
        if (!navigator.geolocation) {
            setStatus("error")
            setErrorMsg("Geolocation is not supported by your browser.")
            return
        }

        setStatus("tracking")
        setErrorMsg("")

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setLocation({ lat: latitude, lng: longitude })
                updateLocationOnServer(latitude, longitude)
            },
            (error) => {
                console.error("Error watching position:", error)
                setStatus("error")
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setErrorMsg("Location permission denied. Please enable it in your device settings.")
                        break
                    case error.POSITION_UNAVAILABLE:
                        setErrorMsg("Location information is unavailable.")
                        break
                    case error.TIMEOUT:
                        setErrorMsg("The request to get user location timed out.")
                        break
                    default:
                        setErrorMsg("An unknown error occurred.")
                        break
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    const stopTracking = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setStatus("idle")
    }

    // Update order status (picked_up, out_for_delivery, delivered)
    const updateOrderStatus = async (newStatus) => {
        if (!order) return
        setStatusUpdating(true)
        try {
            const res = await fetch(`${API_URL}/delivery/order/${order._id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, partnerId })
            })
            const data = await res.json()
            if (data.success) {
                setOrder(prev => prev ? { ...prev, status: newStatus } : null)
                if (newStatus === "delivered") {
                    stopTracking()
                    setOrder(null) // clear order after delivery
                }
            } else {
                setErrorMsg(data.message || "Failed to update status")
            }
        } catch (err) {
            setErrorMsg("Network error updating status")
        } finally {
            setStatusUpdating(false)
        }
    }

    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [])

    const getNextAction = () => {
        if (!order) return null
        switch (order.status) {
            case "assigned": return { label: "📦 Confirm Pickup", status: "picked_up", color: "#2563eb" }
            case "picked_up": return { label: "🏍️ Start Delivery", status: "out_for_delivery", color: "#f59e0b" }
            case "out_for_delivery": return { label: "✅ Mark Delivered", status: "delivered", color: "#16a34a" }
            default: return null
        }
    }

    const nextAction = getNextAction()

    return (
        <div className="share-loc-page">
            <div className="share-loc-card">
                <div className="share-loc-header">
                    <div className="pulse-icon">🏍️</div>
                    <h2>Delivery Partner Dashboard</h2>
                    <p>Share your real-time GPS location with the customer</p>
                </div>

                {/* Current Order Info */}
                {orderLoading ? (
                    <div className="share-loc-order-loading">Loading order details...</div>
                ) : order ? (
                    <div className="share-loc-order">
                        <h4>📋 Current Order</h4>
                        <div className="order-info-grid">
                            <div className="order-info-item">
                                <span>Order ID</span>
                                <strong>#{order._id?.slice(-8).toUpperCase()}</strong>
                            </div>
                            <div className="order-info-item">
                                <span>Status</span>
                                <strong className={`status-${order.status}`}>
                                    {order.status?.replace(/_/g, ' ').toUpperCase()}
                                </strong>
                            </div>
                            <div className="order-info-item">
                                <span>Amount</span>
                                <strong>₹{order.totalAmount}</strong>
                            </div>
                            <div className="order-info-item">
                                <span>Payment</span>
                                <strong>{order.paymentMethod === 'cod' ? '💵 COD' : '💳 Paid'}</strong>
                            </div>
                        </div>
                        {order.customer && (
                            <div className="order-customer">
                                <span>👤 {order.customer.name}</span>
                                <a href={`tel:${order.customer.phone}`} className="customer-call">📞 Call</a>
                            </div>
                        )}
                        {order.deliveryAddress && (
                            <div className="order-drop">
                                📍 {order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.pinCode}
                            </div>
                        )}
                        <div className="order-items-list">
                            {order.items?.map((item, i) => (
                                <span key={i}>{item.name} ×{item.quantity}</span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="share-loc-no-order">No active order assigned.</div>
                )}

                {/* Status Badge */}
                <div className="share-loc-status">
                    {status === "idle" && (
                        <div className="status-badge idle">Not Tracking</div>
                    )}
                    {status === "tracking" && (
                        <div className="status-badge active">
                            <span className="live-dot"></span> Live Tracking Active
                        </div>
                    )}
                    {status === "error" && (
                        <div className="status-badge error">Error</div>
                    )}
                </div>

                {errorMsg && <div className="share-loc-error">{errorMsg}</div>}

                {/* Coordinates */}
                {location && status === "tracking" && (
                    <div className="share-loc-details">
                        <div className="detail-item">
                            <span>Latitude</span>
                            <strong>{location.lat.toFixed(6)}</strong>
                        </div>
                        <div className="detail-item">
                            <span>Longitude</span>
                            <strong>{location.lng.toFixed(6)}</strong>
                        </div>
                        <div className="detail-item">
                            <span>Updates Sent</span>
                            <strong>{updateCount}</strong>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="share-loc-actions">
                    {status !== "tracking" ? (
                        <button className="btn-start" onClick={startTracking}>
                            ▶ Start Sharing Location
                        </button>
                    ) : (
                        <button className="btn-stop" onClick={stopTracking}>
                            ⏹ Stop Sharing
                        </button>
                    )}
                </div>

                {/* Order Status Actions */}
                {nextAction && order && (
                    <div className="share-loc-actions" style={{ marginTop: 12 }}>
                        <button
                            className="btn-status-update"
                            style={{ background: nextAction.color }}
                            onClick={() => updateOrderStatus(nextAction.status)}
                            disabled={statusUpdating}
                        >
                            {statusUpdating ? "Updating..." : nextAction.label}
                        </button>
                    </div>
                )}

                <p className="share-loc-note">
                    Keep this page open and your screen on while delivering for continuous tracking.
                </p>
            </div>
        </div>
    )
}

export default ShareLocation

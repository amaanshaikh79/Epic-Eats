import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    adminGetOrders, adminUpdateOrderStatus, adminGetDeliveryPartners,
    adminAssignDeliveryPartner, isLoggedIn, getStoredUser
} from "../../utils/api.js"
import AdminLayout from "./AdminLayout.js"
import "../../css/Admin.css"

const statusColors = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    preparing: "#8b5cf6",
    assigned: "#6366f1",
    picked_up: "#0ea5e9",
    out_for_delivery: "#f97316",
    shipped: "#06b6d4",
    delivered: "#22c55e",
    cancelled: "#ef4444"
}

const statusLabel = (s) => {
    const labels = {
        out_for_delivery: "Out for Delivery",
        picked_up: "Picked Up"
    }
    return labels[s] || s.charAt(0).toUpperCase() + s.slice(1)
}

const AdminOrders = () => {
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")
    const [expandedId, setExpandedId] = useState(null)
    const [msg, setMsg] = useState("")
    const [deliveryPartners, setDeliveryPartners] = useState([])
    const [assigningOrderId, setAssigningOrderId] = useState(null)
    const [selectedPartnerId, setSelectedPartnerId] = useState("")

    useEffect(() => {
        if (!isLoggedIn()) { navigate("/login"); return }
        const user = getStoredUser()
        if (!user || user.role !== "admin") { navigate("/"); return }
        fetchOrders()
        fetchPartners()
    }, [navigate, filter])

    const fetchOrders = async () => {
        try {
            const data = await adminGetOrders({ status: filter || undefined })
            setOrders(data.orders)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const fetchPartners = async () => {
        try {
            const data = await adminGetDeliveryPartners({ available: 'true' })
            setDeliveryPartners(data.partners)
        } catch (err) { console.error(err) }
    }

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await adminUpdateOrderStatus(orderId, newStatus)
            fetchOrders()
            setMsg(`Order updated to ${newStatus}`)
            setTimeout(() => setMsg(""), 3000)
        } catch (err) { setMsg("Error: " + err.message) }
    }

    const handleAssign = async (orderId) => {
        if (!selectedPartnerId) {
            setMsg("Please select a delivery partner")
            setTimeout(() => setMsg(""), 3000)
            return
        }
        try {
            const data = await adminAssignDeliveryPartner(orderId, selectedPartnerId)
            setMsg(`✅ ${data.message}`)
            setAssigningOrderId(null)
            setSelectedPartnerId("")
            fetchOrders()
            fetchPartners()
            setTimeout(() => setMsg(""), 5000)
        } catch (err) { setMsg("Error: " + err.message) }
    }

    if (loading) return (
        <AdminLayout title="Orders" subtitle="Loading...">
            <div className="admin-loading-inner">Loading orders...</div>
        </AdminLayout>
    )

    return (
        <AdminLayout title="Orders" subtitle={`${orders.length} orders total`}>
            {msg && <div className="admin-msg">{msg}</div>}

            {/* Filter */}
            <div className="order-filters">
                {["", "pending", "confirmed", "preparing", "assigned", "picked_up", "out_for_delivery", "shipped", "delivered", "cancelled"].map(s => (
                    <button key={s} className={`filter-btn ${filter === s ? "active" : ""}`} onClick={() => { setFilter(s); setLoading(true) }}>
                        {s === "" ? "All" : statusLabel(s)}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="no-orders-admin"><h3>No orders found</h3></div>
            ) : (
                <div className="admin-orders-list">
                    {orders.map(order => (
                        <div key={order._id} className="admin-order-card">
                            <div className="aorder-header" onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}>
                                <div className="aorder-info">
                                    <span className="aorder-id">#{order._id.slice(-8).toUpperCase()}</span>
                                    <span className="aorder-customer">{order.user?.fullName || "Unknown"}</span>
                                    <span className="aorder-date">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                    <span className="aorder-total">₹{order.totalAmount}</span>
                                    <span className="aorder-payment">{order.paymentMethod === "cod" ? "COD" : "Online"}</span>
                                    {order.deliveryPartner && (
                                        <span className="aorder-partner-badge">🏍️ {order.deliveryPartner.name}</span>
                                    )}
                                </div>
                                <div className="aorder-status-area">
                                    <select
                                        value={order.status}
                                        onChange={e => { e.stopPropagation(); handleStatusChange(order._id, e.target.value) }}
                                        className="status-select"
                                        style={{ borderColor: statusColors[order.status] }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {["pending", "confirmed", "preparing", "assigned", "picked_up", "out_for_delivery", "shipped", "delivered", "cancelled"].map(s => (
                                            <option key={s} value={s}>
                                                {statusLabel(s)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {expandedId === order._id && (
                                <div className="aorder-details">
                                    <div className="aorder-items">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="aorder-item">
                                                <span>{item.name}</span>
                                                <span>×{item.quantity}</span>
                                                <span>₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="aorder-footer">
                                        <div>
                                            <strong>Customer:</strong> {order.user?.fullName} ({order.user?.email})
                                            {order.user?.phone && <span> | 📞 {order.user.phone}</span>}
                                        </div>
                                        {order.deliveryAddress && (
                                            <div>
                                                <strong>Address:</strong>{" "}
                                                {typeof order.deliveryAddress === "string"
                                                    ? order.deliveryAddress
                                                    : `${order.deliveryAddress.street}, ${order.deliveryAddress.city} - ${order.deliveryAddress.pinCode}`
                                                }
                                            </div>
                                        )}
                                        <div>
                                            <strong>Payment:</strong> {order.paymentMethod.toUpperCase()} — {order.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
                                        </div>

                                        {/* Delivery Partner Assignment */}
                                        {order.deliveryPartner ? (
                                            <div className="assigned-partner-info">
                                                <strong>🏍️ Delivery Partner:</strong>{" "}
                                                {order.deliveryPartner.name} ({order.deliveryPartner.phone})
                                                {" "}<span className="active-badge active">Assigned</span>
                                                {order.trackingToken && (
                                                    <div style={{ marginTop: "8px" }}>
                                                        <strong>📍 Track Link:</strong>{" "}
                                                        <a href={`/track/${order._id}/${order.trackingToken}`} target="_blank" rel="noreferrer" className="track-link-admin">
                                                            Open Tracking Page →
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="assign-partner-section">
                                                {assigningOrderId === order._id ? (
                                                    <div className="assign-form">
                                                        <select
                                                            value={selectedPartnerId}
                                                            onChange={e => setSelectedPartnerId(e.target.value)}
                                                            className="status-select"
                                                            style={{ borderColor: "#2563eb", minWidth: "200px" }}
                                                        >
                                                            <option value="">Select delivery partner</option>
                                                            {deliveryPartners.map(p => (
                                                                <option key={p._id} value={p._id}>
                                                                    {p.name} ({p.vehicleType}) — {p.phone}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button className="save-btn" style={{ padding: "8px 18px", fontSize: "0.85rem" }} onClick={() => handleAssign(order._id)}>
                                                            Assign
                                                        </button>
                                                        <button className="cancel-btn" style={{ padding: "8px 18px", fontSize: "0.85rem" }} onClick={() => setAssigningOrderId(null)}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="assign-btn"
                                                        onClick={(e) => { e.stopPropagation(); setAssigningOrderId(order._id); setSelectedPartnerId("") }}
                                                    >
                                                        🏍️ Assign Delivery Partner
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminOrders

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getMyOrders, isLoggedIn } from "../utils/api.js"
import "../css/OrderHistory.css"

const statusColors = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    preparing: "#8b5cf6",
    shipped: "#06b6d4",
    delivered: "#22c55e",
    cancelled: "#ef4444"
}

const OrderHistory = () => {
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [filter, setFilter] = useState("all")

    useEffect(() => {
        if (!isLoggedIn()) { navigate("/login"); return }
        fetchOrders()
    }, [navigate])

    const fetchOrders = async () => {
        try {
            const data = await getMyOrders()
            setOrders(data.orders)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)

    if (loading) return <div className="orders-page"><div className="orders-loading">Loading orders...</div></div>

    return (
        <div className="orders-page">
            <section className="orders-hero">
                <h1>My Orders</h1>
                <p>{orders.length} {orders.length === 1 ? "order" : "orders"} placed</p>
            </section>

            <section className="orders-content">
                {/* Filter Tabs */}
                <div className="order-filters">
                    {["all", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"].map(s => (
                        <button key={s} className={`filter-btn ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
                            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="no-orders">
                        <div className="no-orders-icon">📦</div>
                        <h2>No orders found</h2>
                        <p>You haven't placed any orders yet.</p>
                        <button onClick={() => navigate("/menu")} className="browse-btn">Browse Menu</button>
                    </div>
                ) : (
                    <div className="orders-list">
                        {filtered.map(order => (
                            <div key={order._id} className="order-card" onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}>
                                <div className="order-header">
                                    <div className="order-id">
                                        <span className="label">Order</span>
                                        <span className="id">#{order._id.slice(-8).toUpperCase()}</span>
                                    </div>
                                    <span className="order-status" style={{ background: statusColors[order.status] + "20", color: statusColors[order.status] }}>
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </span>
                                </div>

                                <div className="order-meta">
                                    <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    <span>{order.items.length} items</span>
                                    <span className="order-total">₹{order.totalAmount}</span>
                                </div>

                                <div className="order-payment">
                                    <span className="pay-method">{order.paymentMethod === "cod" ? "💵 Cash on Delivery" : "💳 Online"}</span>
                                    <span className={`pay-status ${order.paymentStatus}`}>
                                        {order.paymentStatus === "paid" ? "✅ Paid" : order.paymentStatus === "failed" ? "❌ Failed" : "⏳ Pending"}
                                    </span>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === order._id && (
                                    <div className="order-details" onClick={e => e.stopPropagation()}>
                                        <h4>Items</h4>
                                        <div className="order-items">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="order-item-row">
                                                    <span className="item-name">{item.name}</span>
                                                    <span className="item-qty">x{item.quantity}</span>
                                                    <span className="item-price">₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="order-summary-row">
                                            <span>Subtotal</span>
                                            <span>₹{order.totalAmount - (order.deliveryFee || 0)}</span>
                                        </div>
                                        <div className="order-summary-row">
                                            <span>Delivery Fee</span>
                                            <span>{order.deliveryFee ? `₹${order.deliveryFee}` : "FREE"}</span>
                                        </div>
                                        <div className="order-summary-row total">
                                            <span>Total</span>
                                            <span>₹{order.totalAmount}</span>
                                        </div>
                                        {order.deliveryAddress && (
                                            <div className="order-address">
                                                <h4>📍 Delivery Address</h4>
                                                <p>{typeof order.deliveryAddress === "string"
                                                    ? order.deliveryAddress
                                                    : `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pinCode}`
                                                }</p>
                                            </div>
                                        )}
                                        <button
                                            className="invoice-link-btn"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order._id}/invoice`) }}
                                        >
                                            📄 View Invoice
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

export default OrderHistory

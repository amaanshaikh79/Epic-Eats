import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getOrder, isLoggedIn } from "../utils/api.js"
import "../css/OrderConfirmation.css"

const OrderConfirmation = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isLoggedIn()) { navigate("/login"); return }
        fetchOrder()
    }, [id, navigate])

    const fetchOrder = async () => {
        try {
            const data = await getOrder(id)
            setOrder(data.order)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    if (loading) return <div className="confirm-page"><div className="confirm-loading">Loading...</div></div>

    if (!order) return (
        <div className="confirm-page">
            <div className="confirm-error">
                <h2>Order not found</h2>
                <button onClick={() => navigate("/orders")}>View All Orders</button>
            </div>
        </div>
    )

    return (
        <div className="confirm-page">
            <div className="confirm-card">
                <div className="confirm-icon">✅</div>
                <h1>Order Confirmed!</h1>
                <p className="confirm-subtitle">Your delicious food is being prepared</p>

                <div className="confirm-details">
                    <div className="detail-row">
                        <span>Order ID</span>
                        <span className="detail-value">#{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className="detail-row">
                        <span>Status</span>
                        <span className="status-badge confirmed">{order.status}</span>
                    </div>
                    <div className="detail-row">
                        <span>Payment</span>
                        <span>{order.paymentMethod === "cod" ? "💵 Cash on Delivery" : "💳 Online"}</span>
                    </div>
                    <div className="detail-row">
                        <span>Estimated Delivery</span>
                        <span>30-45 minutes</span>
                    </div>
                </div>

                <div className="confirm-items">
                    <h3>Order Items</h3>
                    {order.items.map((item, idx) => (
                        <div key={idx} className="confirm-item">
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                        </div>
                    ))}
                    <div className="confirm-item subtotal">
                        <span>Delivery Fee</span>
                        <span>{order.deliveryFee ? `₹${order.deliveryFee}` : "FREE"}</span>
                    </div>
                    <div className="confirm-item total">
                        <span>Total</span>
                        <span>₹{order.totalAmount}</span>
                    </div>
                </div>

                {order.deliveryAddress && (
                    <div className="confirm-address">
                        <h3>📍 Delivery Address</h3>
                        <p>{typeof order.deliveryAddress === "string"
                            ? order.deliveryAddress
                            : `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pinCode}`
                        }</p>
                    </div>
                )}

                <div className="confirm-actions">
                    <button className="primary-btn" onClick={() => navigate(`/orders/${order._id}/invoice`)}>📄 View Invoice</button>
                    <button className="secondary-btn" onClick={() => navigate("/menu")}>Order More</button>
                    <button className="secondary-btn" onClick={() => navigate("/orders")}>View All Orders</button>
                </div>
            </div>
        </div>
    )
}

export default OrderConfirmation

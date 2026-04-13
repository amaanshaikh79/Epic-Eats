import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getCart, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartItemCount } from "../utils/cart.js"
import { createOrder, verifyPayment, isLoggedIn, getProfile, getStoredUser } from "../utils/api.js"
import "../css/Cart.css"

const Cart = () => {
    const [cartItems, setCartItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [orderId, setOrderId] = useState(null)
    const [error, setError] = useState("")
    const [addresses, setAddresses] = useState([])
    const [selectedAddressIdx, setSelectedAddressIdx] = useState(0)
    const [manualAddress, setManualAddress] = useState({ street: "", city: "", state: "", pinCode: "", phone: "" })
    const [useManual, setUseManual] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState("cod")
    const navigate = useNavigate()

    useEffect(() => {
        setCartItems(getCart())
        // Load user addresses if logged in
        if (isLoggedIn()) {
            getProfile().then(data => {
                if (data.user?.addresses?.length > 0) {
                    setAddresses(data.user.addresses)
                    const defaultIdx = data.user.addresses.findIndex(a => a.isDefault)
                    setSelectedAddressIdx(defaultIdx >= 0 ? defaultIdx : 0)
                } else {
                    setUseManual(true)
                }
            }).catch(() => { setUseManual(true) })
        }
    }, [])

    const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
    const deliveryFee = subtotal >= 500 ? 0 : 40
    const total = subtotal + deliveryFee

    const handleQuantityChange = (itemId, newQty) => {
        const updated = updateQuantity(itemId, newQty)
        setCartItems(updated)
    }

    const handleRemove = (itemId) => {
        const updated = removeFromCart(itemId)
        setCartItems(updated)
    }

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script")
            script.src = "https://checkout.razorpay.com/v1/checkout.js"
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleCheckout = async () => {
        if (!isLoggedIn()) { navigate("/login"); return }

        // Determine address
        let deliveryAddress
        if (useManual || addresses.length === 0) {
            if (!manualAddress.street || !manualAddress.city || !manualAddress.pinCode || !manualAddress.phone) {
                setError("Please fill in all address fields")
                return
            }
            deliveryAddress = { ...manualAddress, state: manualAddress.state || "N/A" }
        } else {
            const addr = addresses[selectedAddressIdx]
            deliveryAddress = { label: addr.label, street: addr.street, city: addr.city, state: addr.state, pinCode: addr.pinCode, phone: addr.phone }
        }

        setLoading(true)
        setError("")

        try {
            const orderData = {
                items: cartItems.map((item) => ({
                    menuItem: item._id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })),
                deliveryAddress,
                paymentMethod,
            }

            const result = await createOrder(orderData)

            if (paymentMethod === "online" && result.razorpayOrderId) {
                const res = await loadRazorpay()
                if (!res) {
                    setError("Razorpay SDK failed to load. Are you online?")
                    setLoading(false)
                    return
                }

                const options = {
                    key: result.key,
                    amount: result.amount,
                    currency: result.currency,
                    name: "Epic Eats",
                    description: "Food Order Payment",
                    order_id: result.razorpayOrderId,
                    handler: async function (response) {
                         try {
                             await verifyPayment({
                                 razorpay_order_id: response.razorpay_order_id,
                                 razorpay_payment_id: response.razorpay_payment_id,
                                 razorpay_signature: response.razorpay_signature
                             });
                             clearCart()
                             setCartItems([])
                             setOrderId(result.order._id)
                         } catch (verifyErr) {
                             setError(verifyErr.message || "Payment verification failed")
                         }
                    },
                    prefill: {
                         name: getStoredUser()?.name || "",
                         email: getStoredUser()?.email || "",
                         contact: deliveryAddress.phone || ""
                    },
                    theme: {
                         color: "#ff4500"
                    }
                }
                const paymentObject = new window.Razorpay(options)
                paymentObject.on('payment.failed', function (response) {
                    setError("Payment failed: " + response.error.description)
                })
                paymentObject.open()
                setLoading(false)
            } else {
                clearCart()
                setCartItems([])
                setOrderId(result.order._id)
                setLoading(false)
            }
        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    // Success Screen
    if (orderId) {
        return (
            <div className="cart-page">
                <div className="order-success">
                    <div className="success-icon">✅</div>
                    <h2>Order Placed Successfully!</h2>
                    <p>Your delicious food is being prepared and will be delivered soon.</p>
                    <div className="success-actions">
                        <button onClick={() => navigate(`/orders/${orderId}`)} className="continue-btn">
                            View Order
                        </button>
                        <button onClick={() => navigate("/menu")} className="home-btn">
                            Order More
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-page">
                <div className="empty-cart">
                    <div className="empty-icon">🛒</div>
                    <h2>Your Cart is Empty</h2>
                    <p>Looks like you haven't added anything yet. Browse our menu and add your favourite dishes!</p>
                    <button onClick={() => navigate("/menu")} className="browse-btn">
                        Browse Menu
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="cart-page">

            {/* Cart Header */}
            <section className="cart-hero">
                <div className="cart-hero-content">
                    <h1 className="cart-title">Your Cart</h1>
                    <p className="cart-subtitle">
                        {getCartItemCount()} {getCartItemCount() === 1 ? "item" : "items"} in your cart
                    </p>
                </div>
            </section>

            {/* Cart Content */}
            <section className="cart-content">
                <div className="cart-container">

                    {/* Cart Items */}
                    <div className="cart-items-section">
                        {cartItems.map((item) => (
                            <div key={item._id} className="cart-item">
                                <div className="cart-item-image">
                                    <img src={item.image} alt={item.name} loading="lazy" />
                                </div>
                                <div className="cart-item-details">
                                    <h3>{item.name}</h3>
                                    <p className="cart-item-price">₹{item.price}</p>
                                </div>
                                <div className="cart-item-controls">
                                    <div className="quantity-controls">
                                        <button className="qty-btn" onClick={() => handleQuantityChange(item._id, item.quantity - 1)}>−</button>
                                        <span className="qty-display">{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => handleQuantityChange(item._id, item.quantity + 1)}>+</button>
                                    </div>
                                    <p className="cart-item-subtotal">₹{item.price * item.quantity}</p>
                                    <button className="remove-btn" onClick={() => handleRemove(item._id)}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="order-summary">
                        <h2>Order Summary</h2>

                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>₹{subtotal}</span>
                        </div>
                        <div className="summary-row">
                            <span>Delivery</span>
                            <span className={deliveryFee === 0 ? "free-delivery" : ""}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                        </div>
                        {deliveryFee > 0 && (
                            <p className="free-hint">Add ₹{500 - subtotal} more for free delivery!</p>
                        )}
                        <div className="summary-row total-row">
                            <span>Total</span>
                            <span>₹{total}</span>
                        </div>

                        {/* Payment Method */}
                        <div className="checkout-section">
                            <label className="section-label">Payment Method</label>
                            <div className="payment-options">
                                <label className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                                    <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                                    <span>💵 Cash on Delivery</span>
                                </label>
                                <label className={`payment-option ${paymentMethod === "online" ? "selected" : ""}`}>
                                    <input type="radio" name="payment" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} />
                                    <span>💳 Online Payment</span>
                                </label>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="checkout-section">
                            <label className="section-label">Delivery Address</label>

                            {/* Saved Addresses */}
                            {addresses.length > 0 && !useManual && (
                                <div className="saved-addresses">
                                    {addresses.map((addr, idx) => (
                                        <label key={addr._id} className={`address-option ${selectedAddressIdx === idx ? "selected" : ""}`}>
                                            <input type="radio" name="address" checked={selectedAddressIdx === idx} onChange={() => setSelectedAddressIdx(idx)} />
                                            <div>
                                                <strong>{addr.label === "home" ? "🏠" : addr.label === "work" ? "💼" : "📌"} {addr.label}</strong>
                                                <p>{addr.street}, {addr.city} - {addr.pinCode}</p>
                                            </div>
                                        </label>
                                    ))}
                                    <button className="manual-toggle" onClick={() => setUseManual(true)}>+ Use different address</button>
                                </div>
                            )}

                            {/* Manual Address */}
                            {(useManual || addresses.length === 0) && (
                                <div className="manual-address">
                                    <input placeholder="Street address *" value={manualAddress.street} onChange={e => setManualAddress({ ...manualAddress, street: e.target.value })} />
                                    <div className="address-row">
                                        <input placeholder="City *" value={manualAddress.city} onChange={e => setManualAddress({ ...manualAddress, city: e.target.value })} />
                                        <input placeholder="State" value={manualAddress.state} onChange={e => setManualAddress({ ...manualAddress, state: e.target.value })} />
                                    </div>
                                    <div className="address-row">
                                        <input placeholder="Pin Code *" value={manualAddress.pinCode} onChange={e => setManualAddress({ ...manualAddress, pinCode: e.target.value })} />
                                        <input placeholder="Phone *" value={manualAddress.phone} onChange={e => setManualAddress({ ...manualAddress, phone: e.target.value })} />
                                    </div>
                                    {addresses.length > 0 && (
                                        <button className="manual-toggle" onClick={() => setUseManual(false)}>← Use saved address</button>
                                    )}
                                </div>
                            )}
                        </div>

                        {error && <p className="cart-error">{error}</p>}

                        <button
                            className="checkout-btn"
                            onClick={handleCheckout}
                            disabled={loading}
                        >
                            {loading ? "Placing Order..." : `Place Order — ₹${total}`}
                        </button>

                        {!isLoggedIn() && (
                            <p className="login-notice">
                                You'll need to <span onClick={() => navigate("/login")} className="login-link">log in</span> to place an order
                            </p>
                        )}
                    </div>

                </div>
            </section>

        </div>
    )
}

export default Cart

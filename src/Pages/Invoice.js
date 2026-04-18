import { useEffect, useState, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getInvoice, isLoggedIn, getStoredUser } from "../utils/api.js"
import "../css/Invoice.css"

const Invoice = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const invoiceRef = useRef(null)
    const [invoice, setInvoice] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!isLoggedIn()) { navigate("/login"); return }
        fetchInvoice()
    }, [id, navigate])

    const fetchInvoice = async () => {
        try {
            const data = await getInvoice(id)
            setInvoice(data.invoice)
        } catch (err) {
            console.error(err)
            setError(err.message || "Failed to load invoice")
        }
        finally { setLoading(false) }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownload = () => {
        window.print()
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        })
    }

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        })
    }

    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        })
    }

    const generateInvoiceNumber = (orderId, createdAt) => {
        const date = new Date(createdAt)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        return `EE-${year}${month}-${orderId.slice(-6).toUpperCase()}`
    }

    if (loading) return (
        <div className="invoice-page">
            <div className="invoice-loading">
                <div className="invoice-loading-spinner"></div>
                <p>Generating your invoice...</p>
            </div>
        </div>
    )

    if (error || !invoice) return (
        <div className="invoice-page">
            <div className="invoice-error">
                <div className="error-icon">📄</div>
                <h2>Invoice Not Available</h2>
                <p>{error || "The requested invoice could not be found."}</p>
                <button onClick={() => navigate("/orders")} className="inv-btn inv-btn-primary">View All Orders</button>
            </div>
        </div>
    )

    const subtotal = invoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const deliveryFee = invoice.deliveryFee || 0
    const taxRate = 0.05 // 5% GST
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100
    const grandTotal = invoice.totalAmount
    const invoiceNumber = generateInvoiceNumber(invoice._id, invoice.createdAt)

    return (
        <div className="invoice-page">
            {/* Action Bar — hidden on print */}
            <div className="invoice-actions no-print">
                <button onClick={() => navigate(-1)} className="inv-btn inv-btn-ghost">
                    ← Back
                </button>
                <div className="invoice-actions-right">
                    <button onClick={handlePrint} className="inv-btn inv-btn-outline">
                        🖨️ Print
                    </button>
                    <button onClick={handleDownload} className="inv-btn inv-btn-primary">
                        📥 Download PDF
                    </button>
                </div>
            </div>

            {/* Invoice Document */}
            <div className="invoice-document" ref={invoiceRef} id="invoice-content">

                {/* Header */}
                <header className="invoice-header">
                    <div className="invoice-brand">
                        <div className="invoice-logo">
                            <span className="logo-icon">🍽️</span>
                            <div>
                                <h1 className="brand-name">Epic Eats</h1>
                                <p className="brand-tagline">Premium Food Delivery</p>
                            </div>
                        </div>
                        <div className="invoice-company-info">
                            <p>123 Foodie Street, Gourmet Plaza</p>
                            <p>Mumbai, Maharashtra — 400001</p>
                            <p>GSTIN: 27AABCE1234F1Z5</p>
                            <p>support@epiceats.in | +91 98765 43210</p>
                        </div>
                    </div>
                    <div className="invoice-title-section">
                        <h2 className="invoice-title">TAX INVOICE</h2>
                        <div className="invoice-meta-grid">
                            <div className="meta-item">
                                <span className="meta-label">Invoice No.</span>
                                <span className="meta-value">{invoiceNumber}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Date</span>
                                <span className="meta-value">{formatDate(invoice.createdAt)}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Time</span>
                                <span className="meta-value">{formatTime(invoice.createdAt)}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Order ID</span>
                                <span className="meta-value">#{invoice._id.slice(-8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Divider */}
                <div className="invoice-divider"></div>

                {/* Bill To & Payment Info */}
                <section className="invoice-parties">
                    <div className="party-block">
                        <h3 className="party-title">Bill To</h3>
                        <div className="party-details">
                            <p className="party-name">{invoice.user?.fullName || getStoredUser()?.name || "Customer"}</p>
                            <p>{invoice.user?.email || getStoredUser()?.email || ""}</p>
                            {invoice.user?.phone && <p>📞 {invoice.user.phone}</p>}
                            {invoice.deliveryAddress && (
                                <p className="party-address">
                                    {typeof invoice.deliveryAddress === "string"
                                        ? invoice.deliveryAddress
                                        : `${invoice.deliveryAddress.street}, ${invoice.deliveryAddress.city}, ${invoice.deliveryAddress.state} — ${invoice.deliveryAddress.pinCode}`
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="party-block party-right">
                        <h3 className="party-title">Payment Details</h3>
                        <div className="party-details">
                            <div className="payment-detail-row">
                                <span>Method</span>
                                <span>{invoice.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</span>
                            </div>
                            <div className="payment-detail-row">
                                <span>Status</span>
                                <span className={`payment-status-badge ${invoice.paymentStatus}`}>
                                    {invoice.paymentStatus === "paid" ? "✅ Paid" : invoice.paymentStatus === "failed" ? "❌ Failed" : "⏳ Pending"}
                                </span>
                            </div>
                            {invoice.paymentId && (
                                <div className="payment-detail-row">
                                    <span>Transaction ID</span>
                                    <span className="txn-id">{invoice.paymentId}</span>
                                </div>
                            )}
                            {invoice.razorpayOrderId && (
                                <div className="payment-detail-row">
                                    <span>Razorpay Order</span>
                                    <span className="txn-id">{invoice.razorpayOrderId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <div className="invoice-divider"></div>

                {/* Order Status Banner */}
                <div className={`order-status-banner status-${invoice.status}`}>
                    <span className="status-dot"></span>
                    <span>Order Status: <strong>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</strong></span>
                    {invoice.updatedAt && invoice.updatedAt !== invoice.createdAt && (
                        <span className="status-updated">Last updated: {formatDateTime(invoice.updatedAt)}</span>
                    )}
                </div>

                {/* Items Table */}
                <section className="invoice-items-section">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th className="th-sno">#</th>
                                <th className="th-item">Item Description</th>
                                <th className="th-unit">Unit</th>
                                <th className="th-qty">Qty</th>
                                <th className="th-rate">Rate (₹)</th>
                                <th className="th-amount">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="td-sno">{idx + 1}</td>
                                    <td className="td-item">
                                        <span className="item-name">{item.name}</span>
                                    </td>
                                    <td className="td-unit">{item.unit || "plate"}</td>
                                    <td className="td-qty">{item.quantity}</td>
                                    <td className="td-rate">{item.price.toFixed(2)}</td>
                                    <td className="td-amount">{(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Totals */}
                <section className="invoice-totals">
                    <div className="totals-left">
                        <div className="invoice-note">
                            <h4>📝 Note</h4>
                            <p>Thank you for ordering with Epic Eats! We hope you enjoy your meal. For any queries, contact us at support@epiceats.in</p>
                        </div>
                    </div>
                    <div className="totals-right">
                        <div className="totals-table">
                            <div className="totals-row">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="totals-row">
                                <span>GST (5%)</span>
                                <span>₹{taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="totals-row">
                                <span>Delivery Fee</span>
                                <span className={deliveryFee === 0 ? "free-tag" : ""}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}</span>
                            </div>
                            <div className="totals-row total-grand">
                                <span>Grand Total</span>
                                <span>₹{grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="amount-in-words">
                            Total: <strong>₹{grandTotal.toFixed(2)}</strong> only
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <div className="invoice-divider"></div>

                {/* Delivery Details */}
                {invoice.deliveryAddress && (
                    <section className="invoice-delivery">
                        <h3>📍 Delivery Information</h3>
                        <div className="delivery-grid">
                            <div className="delivery-item">
                                <span className="delivery-label">Address</span>
                                <span className="delivery-value">
                                    {typeof invoice.deliveryAddress === "string"
                                        ? invoice.deliveryAddress
                                        : `${invoice.deliveryAddress.street}, ${invoice.deliveryAddress.city}`
                                    }
                                </span>
                            </div>
                            {typeof invoice.deliveryAddress === "object" && (
                                <>
                                    <div className="delivery-item">
                                        <span className="delivery-label">City</span>
                                        <span className="delivery-value">{invoice.deliveryAddress.city}</span>
                                    </div>
                                    <div className="delivery-item">
                                        <span className="delivery-label">State</span>
                                        <span className="delivery-value">{invoice.deliveryAddress.state}</span>
                                    </div>
                                    <div className="delivery-item">
                                        <span className="delivery-label">PIN Code</span>
                                        <span className="delivery-value">{invoice.deliveryAddress.pinCode}</span>
                                    </div>
                                    <div className="delivery-item">
                                        <span className="delivery-label">Phone</span>
                                        <span className="delivery-value">{invoice.deliveryAddress.phone}</span>
                                    </div>
                                </>
                            )}
                            <div className="delivery-item">
                                <span className="delivery-label">Order Placed</span>
                                <span className="delivery-value">{formatDateTime(invoice.createdAt)}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Footer */}
                <footer className="invoice-footer">
                    <div className="footer-line"></div>
                    <div className="footer-content">
                        <p className="footer-thanks">Thank you for your patronage! 🙏</p>
                        <p className="footer-legal">This is a computer-generated invoice and does not require a signature.</p>
                        <div className="footer-brand">
                            <span>Epic Eats</span>
                            <span>•</span>
                            <span>www.epiceats.in</span>
                            <span>•</span>
                            <span>support@epiceats.in</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default Invoice

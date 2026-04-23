import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    adminGetDeliveryPartners,
    adminCreateDeliveryPartner,
    adminUpdateDeliveryPartner,
    adminDeleteDeliveryPartner,
    isLoggedIn,
    getStoredUser
} from "../../utils/api.js"
import AdminLayout from "./AdminLayout.js"
import "../../css/Admin.css"

const AdminDeliveryPartners = () => {
    const navigate = useNavigate()
    const [partners, setPartners] = useState([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({
        name: "", phone: "", email: "", vehicleType: "bike", vehicleNumber: ""
    })

    useEffect(() => {
        if (!isLoggedIn()) { navigate("/login"); return }
        const user = getStoredUser()
        if (!user || user.role !== "admin") { navigate("/"); return }
        fetchPartners()
    }, [navigate])

    const fetchPartners = async () => {
        try {
            const data = await adminGetDeliveryPartners()
            setPartners(data.partners)
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingId) {
                await adminUpdateDeliveryPartner(editingId, form)
                setMsg("Partner updated successfully")
            } else {
                await adminCreateDeliveryPartner(form)
                setMsg("Partner added successfully")
            }
            setShowForm(false)
            setEditingId(null)
            setForm({ name: "", phone: "", email: "", vehicleType: "bike", vehicleNumber: "" })
            fetchPartners()
            setTimeout(() => setMsg(""), 3000)
        } catch (err) { setMsg("Error: " + err.message) }
    }

    const handleEdit = (p) => {
        setForm({
            name: p.name,
            phone: p.phone,
            email: p.email,
            vehicleType: p.vehicleType || "bike",
            vehicleNumber: p.vehicleNumber || ""
        })
        setEditingId(p._id)
        setShowForm(true)
    }

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Deactivate delivery partner "${name}"?`)) return
        try {
            await adminDeleteDeliveryPartner(id)
            setMsg("Partner deactivated")
            fetchPartners()
            setTimeout(() => setMsg(""), 3000)
        } catch (err) { setMsg("Error: " + err.message) }
    }

    const toggleAvailability = async (id, current) => {
        try {
            await adminUpdateDeliveryPartner(id, { isAvailable: !current })
            fetchPartners()
        } catch (err) { console.error(err) }
    }

    if (loading) return (
        <AdminLayout title="Delivery Partners" subtitle="Loading...">
            <div className="admin-loading-inner">Loading delivery partners...</div>
        </AdminLayout>
    )

    return (
        <AdminLayout title="Delivery Partners" subtitle={`${partners.length} delivery partners`}>
            {msg && <div className="admin-msg">{msg}</div>}

            <div className="admin-toolbar">
                <button className="add-product-btn" onClick={() => {
                    setForm({ name: "", phone: "", email: "", vehicleType: "bike", vehicleNumber: "" })
                    setEditingId(null)
                    setShowForm(true)
                }}>
                    + Add Partner
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="form-modal" onClick={() => setShowForm(false)}>
                    <div className="form-modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingId ? "Edit Delivery Partner" : "Add Delivery Partner"}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="pform-grid">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                </div>
                            </div>
                            <div className="pform-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <div className="form-group">
                                    <label>Vehicle Type</label>
                                    <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
                                        <option value="bike">Bike</option>
                                        <option value="scooter">Scooter</option>
                                        <option value="bicycle">Bicycle</option>
                                        <option value="car">Car</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Vehicle Number</label>
                                    <input value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g. MH04AB1234" />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn">{editingId ? "Update" : "Add Partner"}</button>
                                <button type="button" className="cancel-btn" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Partners Table */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Partner</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Vehicle</th>
                            <th>Deliveries</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partners.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-state" style={{ textAlign: "center", padding: "40px" }}>
                                    No delivery partners yet. Add your first partner!
                                </td>
                            </tr>
                        ) : partners.map(p => (
                            <tr key={p._id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                                <td>
                                    <div className="user-name-cell">
                                        <div className="user-avatar" style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
                                            {p.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    </div>
                                </td>
                                <td>{p.phone}</td>
                                <td>{p.email}</td>
                                <td>
                                    {p.vehicleType?.charAt(0).toUpperCase() + p.vehicleType?.slice(1)}
                                    {p.vehicleNumber && <span style={{ color: "var(--text-light)", display: "block", fontSize: "0.8rem" }}>{p.vehicleNumber}</span>}
                                </td>
                                <td style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}>{p.totalDeliveries || 0}</td>
                                <td>
                                    <button
                                        onClick={() => toggleAvailability(p._id, p.isAvailable)}
                                        className={`active-badge ${p.isAvailable ? "active" : "inactive"}`}
                                        style={{ cursor: "pointer", border: "none" }}
                                    >
                                        {p.isAvailable ? "✅ Available" : "⛔ Busy"}
                                    </button>
                                </td>
                                <td>
                                    <div className="td-actions">
                                        <button className="btn-edit" onClick={() => handleEdit(p)} title="Edit">✏️</button>
                                        <button className="btn-del" onClick={() => handleDelete(p._id, p.name)} title="Deactivate">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    )
}

export default AdminDeliveryPartners

import { useState, useEffect } from "react"
import { adminGetUsers, adminUpdateUser, adminDeleteUser } from "../../utils/api.js"
import AdminLayout from "./AdminLayout.js"
import "../../css/Admin.css"

const AdminCustomers = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [msg, setMsg] = useState("")
    
    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)

    // Edit modal state
    const [editingUser, setEditingUser] = useState(null)
    const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "", role: "user" })

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true)
                const data = await adminGetUsers({ page, search })
                setUsers(data.users)
                setTotalPages(data.pages)
                setTotalUsers(data.total)
                setError("")
            } catch (err) {
                setError(err.message || "Failed to load customers")
            } finally {
                setLoading(false)
            }
        }
        
        // Add a slight debounce for search
        const timeoutId = setTimeout(() => {
            fetchUsers()
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [page, search])

    const handleSearch = (e) => {
        setSearch(e.target.value)
        setPage(1) // Reset to first page on search
    }

    const formatDate = (dateString) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const handleEdit = (user) => {
        setEditForm({
            fullName: user.fullName || "",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "user"
        })
        setEditingUser(user)
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        try {
            await adminUpdateUser(editingUser._id, editForm)
            setMsg("User updated successfully")
            setEditingUser(null)
            // Refresh
            const data = await adminGetUsers({ page, search })
            setUsers(data.users)
            setTimeout(() => setMsg(""), 3000)
        } catch (err) {
            setMsg("Error: " + err.message)
        }
    }

    const handleDelete = async (userId, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return
        try {
            await adminDeleteUser(userId)
            setMsg("User deleted successfully")
            // Refresh
            const data = await adminGetUsers({ page, search })
            setUsers(data.users)
            setTotalUsers(data.total)
            setTotalPages(data.pages)
            setTimeout(() => setMsg(""), 3000)
        } catch (err) {
            setMsg("Error: " + err.message)
        }
    }

    return (
        <AdminLayout 
            title="Customers" 
            subtitle="Manage registered users and view customer details"
        >
            {msg && <div className="admin-msg">{msg}</div>}

            <div className="admin-actions">
                <div className="admin-search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search customers by name, email or phone..."
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <div className="admin-stats-summary">
                    Total Customers: <strong>{totalUsers}</strong>
                </div>
            </div>

            {error && <div className="admin-error">{error}</div>}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="form-modal" onClick={() => setEditingUser(null)}>
                    <div className="form-modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Edit User — {editingUser.fullName}</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="pform-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        value={editForm.fullName}
                                        onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="pform-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="+91..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="save-btn">Update User</button>
                                <button type="button" className="cancel-btn" onClick={() => setEditingUser(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Registration Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                                    Loading customers...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="empty-state">
                                    No customers found.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="user-name-cell">
                                            <div className="user-avatar">
                                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{user.fullName || 'No Name'}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || 'N/A'}</td>
                                    <td>{formatDate(user.createdAt)}</td>
                                    <td>
                                        <div className="td-actions">
                                            <button className="btn-edit" onClick={() => handleEdit(user)} title="Edit User">✏️</button>
                                            <button className="btn-del" onClick={() => handleDelete(user._id, user.fullName)} title="Delete User">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="admin-pagination">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                    >
                        Next
                    </button>
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminCustomers

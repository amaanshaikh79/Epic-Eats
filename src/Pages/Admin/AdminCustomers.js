import { useState, useEffect } from "react"
import { adminGetUsers } from "../../utils/api.js"
import AdminLayout from "./AdminLayout.js"
import "../../css/Admin.css"

const AdminCustomers = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    
    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)

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

    return (
        <AdminLayout 
            title="Customers" 
            subtitle="Manage registered users and view customer details"
        >
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

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Registration Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: "center", padding: "40px" }}>
                                    Loading customers...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="empty-state">
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

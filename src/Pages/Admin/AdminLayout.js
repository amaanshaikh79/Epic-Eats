import { Link, useLocation } from "react-router-dom"

const AdminLayout = ({ children, title, subtitle }) => {
    const location = useLocation()

    const navItems = [
        { path: "/admin", label: "Dashboard", icon: "📊" },
        { path: "/admin/products", label: "Products", icon: "🍔" },
        { path: "/admin/orders", label: "Orders", icon: "📋" },
        { path: "/admin/customers", label: "Customers", icon: "👥" },
        { path: "/admin/delivery-partners", label: "Delivery", icon: "🏍️" },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <span className="sidebar-logo">🔥</span>
                    <div>
                        <span className="sidebar-title">EPIC EATS</span>
                        <span className="sidebar-sub">Admin Panel</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <Link to="/" className="sidebar-link back-link">
                        <span className="sidebar-icon">←</span>
                        <span>Back to Store</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1 className="admin-page-title">{title}</h1>
                        {subtitle && <p className="admin-page-sub">{subtitle}</p>}
                    </div>
                </header>
                <div className="admin-body">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default AdminLayout

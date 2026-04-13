import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { isLoggedIn, removeToken, getStoredUser, logoutUser } from "../utils/api.js"
import { getCartItemCount } from "../utils/cart.js"
import "../css/Navbar.css"

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Check auth state on route change
  useEffect(() => {
    setLoggedIn(isLoggedIn())
    setUser(getStoredUser())
    setCartCount(getCartItemCount())
  }, [location])

  // Scroll detection for glass navbar transition
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMenu = () => setMenuOpen(!menuOpen)
  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {
      // Even if server logout fails, clear local state
    }
    removeToken()
    setLoggedIn(false)
    setUser(null)
    closeMenu()
    navigate("/")
  }

  const isAdmin = user?.role === "admin"

  return (
    <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
      <div className="nav-container">

        <Link to="/" className="nav-logo" onClick={closeMenu}>
          EPIC EATS
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <div className={menuOpen ? "hamburger open" : "hamburger"}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <ul className={menuOpen ? "nav-menu active" : "nav-menu"}>

          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={closeMenu}>Home</Link>
          </li>

          <li className="nav-item">
            <Link to="/menu" className="nav-link" onClick={closeMenu}>Menu</Link>
          </li>

          <li className="nav-item">
            <Link to="/about" className="nav-link" onClick={closeMenu}>About Us</Link>
          </li>

          <li className="nav-item">
            <Link to="/contact" className="nav-link" onClick={closeMenu}>Contact</Link>
          </li>

          <li className="nav-item">
            <Link to="/cart" className="nav-link cart-link" onClick={closeMenu}>
              🛒 Cart{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
          </li>

          {loggedIn && (
            <>
              <li className="nav-item">
                <Link to="/orders" className="nav-link" onClick={closeMenu}>Orders</Link>
              </li>

              <li className="nav-item">
                <Link to="/profile" className="nav-link" onClick={closeMenu}>Profile</Link>
              </li>

              {isAdmin && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link admin-link" onClick={closeMenu}>⚙️ Admin</Link>
                </li>
              )}
            </>
          )}

          {/* AUTH BUTTON */}
          {!loggedIn ? (
            <li className="nav-item">
              <Link
                to="/signup"
                className="nav-link signup-btn"
                onClick={closeMenu}
              >
                Sign Up
              </Link>
            </li>
          ) : (
            <li className="nav-item">
              <button
                className="nav-link logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </li>
          )}

        </ul>
      </div>
    </nav>
  )
}

export default Navbar

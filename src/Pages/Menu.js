import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getMenuItems } from "../utils/api.js"
import { addToCart as addItemToCart, getCart, getCartTotal, getCartItemCount } from "../utils/cart.js"
import "../css/Menu.css"

const Menu = () => {
  const [menuData, setMenuData] = useState({})
  const [selectedCategory, setSelectedCategory] = useState("Popular")
  const [cartCount, setCartCount] = useState(0)
  const [cartTotal, setCartTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [addedItem, setAddedItem] = useState(null)

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true)
        const data = await getMenuItems()
        setMenuData(data.data)
        setError("")
      } catch (err) {
        setError("Failed to load menu. Please try again.")
        console.error("Menu fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
    // Initialize cart counts
    setCartCount(getCartItemCount())
    setCartTotal(getCartTotal())
  }, [])

  const categories = Object.keys(menuData)

  // Filter items based on search query
  const getFilteredItems = () => {
    const items = menuData[selectedCategory] || []
    if (!searchQuery) return items
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const handleAddToCart = (item) => {
    if (item.stock <= 0) return
    addItemToCart(item)
    setCartCount(getCartItemCount())
    setCartTotal(getCartTotal())

    // Show "Added!" feedback
    setAddedItem(item._id)
    setTimeout(() => setAddedItem(null), 1200)
  }

  // Set first available category once data loads
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  if (loading) {
    return (
      <div className="menu-page">
        <section className="menu-hero">
          <div className="menu-hero-content">
            <h1 className="menu-title">Our Menu</h1>
            <p className="menu-subtitle">Loading delicious dishes...</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="menu-page">
        <section className="menu-hero">
          <div className="menu-hero-content">
            <h1 className="menu-title">Our Menu</h1>
            <p className="menu-subtitle" style={{ color: "#ff6b6b" }}>{error}</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="menu-page">

      {/* Hero Section */}
      <section className="menu-hero">
        <div className="menu-hero-content">
          <h1 className="menu-title">Our Menu</h1>
          <p className="menu-subtitle">
            Explore our delicious selection of dishes crafted with love
          </p>

          {/* Search Bar */}
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>
      </section>

      {/* Menu Content */}
      <section className="menu-content">
        <div className="menu-container">

          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="menu-items-grid">
            {getFilteredItems().map(item => (
              <div key={item._id} className={`menu-item-card ${item.stock <= 0 ? 'out-of-stock' : ''}`}>

                {/* Item Image */}
                <div className="item-image">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div className="item-badge">
                    {item.isVeg ? (
                      <span className="veg-badge">🟢 Veg</span>
                    ) : (
                      <span className="non-veg-badge">🔴 Non-Veg</span>
                    )}
                  </div>
                  {item.stock <= 0 && (
                    <div className="oos-overlay">Out of Stock</div>
                  )}
                </div>

                {/* Item Details */}
                <div className="item-details">
                  <div className="item-header">
                    <h3 className="item-name">{item.name}</h3>
                    <div className="item-rating">
                      ⭐ {item.rating}
                    </div>
                  </div>

                  <p className="item-description">{item.description}</p>

                  <div className="item-footer">
                    <span className="item-price">₹{item.price}<span className="item-unit">/{item.unit}</span></span>
                    <button
                      className={`add-btn ${addedItem === item._id ? 'added' : ''}`}
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock <= 0}
                    >
                      {item.stock <= 0 ? "Sold Out" : addedItem === item._id ? "✓ Added!" : "Add to Cart"}
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* No Results Message */}
          {getFilteredItems().length === 0 && (
            <div className="no-results">
              <h3>No items found</h3>
              <p>Try searching for something else</p>
            </div>
          )}

        </div>
      </section>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="floating-cart">
          <Link to="/cart" className="cart-button">
            <span className="cart-icon">🛒</span>
            <span className="cart-info">
              <span className="cart-count">{cartCount} items</span>
              <span className="cart-total">₹{cartTotal}</span>
            </span>
            <span className="view-cart">View Cart</span>
          </Link>
        </div>
      )}

    </div>
  )
}

export default Menu